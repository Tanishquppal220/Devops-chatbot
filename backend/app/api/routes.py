"""API routes with real-time SSE streaming."""

import json
import logging
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.graph import graph
from app.models.schemas import (
    AnalyzeRequest,
    AnalyzeResponse,
    ConversationCreateRequest,
    ConversationResponse,
    StoredMessageResponse,
)
from app.storage.sqlite_store import get_chat_store

logger = logging.getLogger("devops_chatbot.api.routes")
router = APIRouter(prefix="/api/v1", tags=["analysis"])
HISTORY_WINDOW_SIZE = 8


def _title_from_command(command: str) -> str:
    """Generate a compact default title from a user command."""
    cleaned = command.strip()
    if not cleaned:
        return "New Chat"
    return cleaned if len(cleaned) <= 40 else f"{cleaned[:37]}..."


def _resolve_conversation(request: AnalyzeRequest) -> str:
    """Return a valid conversation id, creating one when needed."""
    store = get_chat_store()
    requested_id = request.conversation_id.strip()
    if requested_id:
        if store.get_conversation(requested_id) is None:
            raise HTTPException(
                status_code=404,
                detail=f"Conversation not found: {requested_id}",
            )
        return requested_id

    created = store.create_conversation(_title_from_command(request.command))
    return created["id"]


def _build_history(request: AnalyzeRequest, conversation_id: str) -> list[dict[str, str]]:
    """Build routing history from request payload or stored messages."""
    if request.conversation_history:
        return [
            {
                "role": item.role,
                "content": item.content,
                "agent": item.agent,
            }
            for item in request.conversation_history
        ]

    store = get_chat_store()
    recent_messages = store.list_messages(conversation_id, limit=HISTORY_WINDOW_SIZE)
    return [
        {
            "role": message["role"],
            "content": message["content"],
            "agent": message["agent"],
        }
        for message in recent_messages
        if message["role"] in {"user", "assistant"} and message["content"].strip()
    ]


def _sse(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


def _content_to_text(content: object) -> str:
    """Normalize model chunk content to a plain text string."""
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        parts: list[str] = []
        for item in content:
            if isinstance(item, str):
                parts.append(item)
            elif isinstance(item, dict):
                # Ignore metadata-only dicts and only preserve real text fields.
                if "role" in item and not isinstance(item.get("content"), str):
                    continue
                if "type" in item and item.get("type") in {"role", "metadata", "system"}:
                    continue
                text_value = _content_to_text(item)
                if text_value:
                    parts.append(text_value)
            else:
                value = _content_to_text(item)
                if value:
                    parts.append(value)
        return "".join(parts)
    if isinstance(content, dict):
        if isinstance(content.get("content"), str):
            return content["content"]
        if isinstance(content.get("text"), str):
            return content["text"]
        return ""
    return str(content)


@router.post("/conversations", response_model=ConversationResponse)
async def create_conversation(payload: ConversationCreateRequest):
    """Create and return a new conversation record."""
    store = get_chat_store()
    created = store.create_conversation(payload.title.strip() or "New Chat")
    return ConversationResponse(**created)


@router.get("/conversations", response_model=list[ConversationResponse])
async def list_conversations():
    """List recent conversations."""
    store = get_chat_store()
    return [ConversationResponse(**item) for item in store.list_conversations()]


@router.get("/conversations/{conversation_id}/messages", response_model=list[StoredMessageResponse])
async def list_conversation_messages(conversation_id: str):
    """List messages in one conversation."""
    store = get_chat_store()
    if store.get_conversation(conversation_id) is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return [StoredMessageResponse(**item) for item in store.list_messages(conversation_id)]


@router.delete("/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    """Delete a conversation and its messages."""
    store = get_chat_store()
    deleted = store.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Conversation not found")
    return {"status": "deleted", "id": conversation_id}


# ── Streaming endpoint ────────────────────────────────────────────

@router.post("/analyze/stream", response_class=StreamingResponse)
async def analyze_stream(request: AnalyzeRequest):
    """Analyse a codebase with real-time SSE progress updates.

    SSE event types:
        progress — stage updates (analyzing, routing, running agent)
        token    — streamed LLM output tokens
        result   — final complete result
        error    — something went wrong
        done     — stream finished
    """
    logger.info(
        "Analyze stream request received: command=%s codebase_path=%s mode=%s history_items=%s",
        request.command,
        request.codebase_path,
        request.mode,
        len(request.conversation_history),
    )

    has_codebase_path = bool(request.codebase_path.strip())
    conversation_id = _resolve_conversation(request)
    store = get_chat_store()
    store.add_message(
        conversation_id=conversation_id,
        role="user",
        content=request.command,
    )
    conversation_history = _build_history(request, conversation_id)

    # Validate the path only when it is provided
    if has_codebase_path and not Path(request.codebase_path).is_dir():
        logger.error("Invalid codebase path: %s", request.codebase_path)
        raise HTTPException(
            status_code=400,
            detail=f"Directory not found: {request.codebase_path}",
        )

    async def event_generator():
        try:
            logger.info("Starting analysis stream for path=%s",
                        request.codebase_path)
            if has_codebase_path:
                # Send initial progress
                yield _sse({"type": "progress", "content": "🔍 Analyzing codebase..."})

            initial_state = {
                "command": request.command,
                "codebase_path": request.codebase_path,
                "mode": request.mode,
                "conversation_history": conversation_history,
                "intent": "",
                "routing_source": "",
                "code_context": "",
                "files_analyzed": 0,
                "messages": [],
                "result": "",
            }

            # Accumulate the full result from tokens
            accumulated_result = []
            detected_agent = ""
            routing_source = ""
            files_count = 0

            # Stream events from the LangGraph execution
            async for event in graph.astream_events(
                initial_state, version="v2"
            ):
                kind = event["event"]
                name = event.get("name", "")

                # Node started
                if kind == "on_chain_start" and name in (
                    "analyze_code", "router",
                    "general", "dockerfile", "testcase", "bundlesize", "production",
                ):
                    labels = {
                        "analyze_code": "🔍 Scanning source files...",
                        "router": "🧭 Choosing general vs specialist handling...",
                        "general": "💬 Answering as a DevOps assistant...",
                        "dockerfile": "🐳 Generating Dockerfile...",
                        "testcase": "🧪 Writing test cases...",
                        "bundlesize": "📦 Analyzing bundle size...",
                        "production": "🔒 Analyzing production risks...",
                    }
                    if name == "analyze_code" and not has_codebase_path:
                        continue

                    if name in ("general", "dockerfile", "testcase", "bundlesize", "production"):
                        detected_agent = name
                    progress_message = labels.get(name, f"Running {name}...")
                    logger.info("Progress step: %s", progress_message)
                    yield _sse({
                        "type": "progress",
                        "content": progress_message,
                        "agent": name,
                    })

                # LLM token streaming
                elif kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        token_text = _content_to_text(chunk.content)
                        if not token_text:
                            continue

                        normalized_token = token_text.strip().lower()
                        if normalized_token in {
                            "general",
                            "dockerfile",
                            "testcase",
                            "bundlesize",
                            "production",
                        } and not "".join(accumulated_result).strip():
                            logger.debug(
                                "Skipping initial agent label token: %s",
                                normalized_token,
                            )
                            continue

                        accumulated_result.append(token_text)
                        yield _sse({
                            "type": "token",
                            "content": token_text,
                        })

                # Capture files_analyzed from analyze_code output
                elif kind == "on_chain_end" and name == "analyze_code":
                    if not has_codebase_path:
                        continue
                    output = event.get("data", {}).get("output", {})
                    if isinstance(output, dict):
                        files_count = output.get("files_analyzed", 0)
                        logger.info(
                            "Code analysis complete: files_analyzed=%s", files_count
                        )

                # Capture routing choice and surface it as a progress event
                elif kind == "on_chain_end" and name == "router":
                    output = event.get("data", {}).get("output", {})
                    if isinstance(output, dict):
                        detected_agent = output.get("intent", detected_agent)
                        routing_source = output.get(
                            "routing_source", routing_source)
                        logger.info(
                            "Routing selected: agent=%s source=%s",
                            detected_agent,
                            routing_source or "unknown",
                        )
                        if detected_agent:
                            yield _sse(
                                {
                                    "type": "progress",
                                    "content": (
                                        f"🧭 Routed to {detected_agent} "
                                        f"({routing_source or 'unknown'})"
                                    ),
                                    "agent": detected_agent,
                                    "routing_source": routing_source,
                                }
                            )

            logger.info(
                "Analysis complete; emitting result event agent=%s source=%s files_analyzed=%s",
                detected_agent,
                routing_source,
                files_count,
            )
            final_text = "".join(accumulated_result)
            store.add_message(
                conversation_id=conversation_id,
                role="assistant",
                content=final_text,
                agent=detected_agent,
            )
            yield _sse({
                "type": "result",
                "content": final_text,
                "agent": detected_agent,
                "files_analyzed": files_count,
                "routing_source": routing_source,
                "conversation_id": conversation_id,
            })

        except Exception as exc:
            logger.exception("Error during analysis streaming")
            store.add_message(
                conversation_id=conversation_id,
                role="assistant",
                content=f"Error: {exc}",
            )
            yield _sse({"type": "error", "content": str(exc)})

        logger.info(
            "Analysis streaming generator finished for path=%s", request.codebase_path)
        yield _sse({"type": "done"})

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


# ── Simple (non-streaming) endpoint ──────────────────────────────

@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze(request: AnalyzeRequest):
    """Analyse a codebase and return a single JSON response (no streaming)."""
    logger.info(
        "Analyze request received: command=%s codebase_path=%s mode=%s history_items=%s",
        request.command,
        request.codebase_path,
        request.mode,
        len(request.conversation_history),
    )
    has_codebase_path = bool(request.codebase_path.strip())
    conversation_id = _resolve_conversation(request)
    store = get_chat_store()
    store.add_message(
        conversation_id=conversation_id,
        role="user",
        content=request.command,
    )
    conversation_history = _build_history(request, conversation_id)

    if has_codebase_path and not Path(request.codebase_path).is_dir():
        logger.error("Invalid codebase path: %s", request.codebase_path)
        raise HTTPException(
            status_code=400,
            detail=f"Directory not found: {request.codebase_path}",
        )

    result = await graph.ainvoke(
        {
            "command": request.command,
            "codebase_path": request.codebase_path,
            "mode": request.mode,
            "conversation_history": conversation_history,
            "intent": "",
            "routing_source": "",
            "code_context": "",
            "files_analyzed": 0,
            "messages": [],
            "result": "",
        }
    )

    store.add_message(
        conversation_id=conversation_id,
        role="assistant",
        content=result.get("result", ""),
        agent=result.get("intent", ""),
    )

    logger.info(
        "Analyze request completed: agent=%s source=%s files_analyzed=%s",
        result.get("intent", "unknown"),
        result.get("routing_source", "unknown"),
        result.get("files_analyzed", 0),
    )
    return AnalyzeResponse(
        agent=result.get("intent", "unknown"),
        analysis=result.get("result", ""),
        files_analyzed=result.get("files_analyzed", 0),
        routing_source=result.get("routing_source", ""),
        conversation_id=conversation_id,
    )
