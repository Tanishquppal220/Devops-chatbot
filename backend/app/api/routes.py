"""API routes with real-time SSE streaming."""

import json
from pathlib import Path

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.agents.graph import graph
from app.models.schemas import AnalyzeRequest, AnalyzeResponse

router = APIRouter(prefix="/api/v1", tags=["analysis"])


def _sse(data: dict) -> str:
    """Format a dict as an SSE data line."""
    return f"data: {json.dumps(data)}\n\n"


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
    # Validate the path
    if not Path(request.codebase_path).is_dir():
        raise HTTPException(
            status_code=400,
            detail=f"Directory not found: {request.codebase_path}",
        )

    async def event_generator():
        try:
            # Send initial progress
            yield _sse({"type": "progress", "content": "🔍 Analyzing codebase..."})

            initial_state = {
                "command": request.command,
                "codebase_path": request.codebase_path,
                "intent": "",
                "code_context": "",
                "files_analyzed": 0,
                "messages": [],
                "result": "",
            }

            # Accumulate the full result from tokens
            accumulated_result = []
            detected_agent = ""
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
                    "dockerfile", "testcase", "bundlesize", "production",
                ):
                    labels = {
                        "analyze_code": "🔍 Scanning source files...",
                        "router": "🧭 Classifying your request...",
                        "dockerfile": "🐳 Generating Dockerfile...",
                        "testcase": "🧪 Writing test cases...",
                        "bundlesize": "📦 Analyzing bundle size...",
                        "production": "🔒 Analyzing production risks...",
                    }
                    if name in ("dockerfile", "testcase", "bundlesize", "production"):
                        detected_agent = name
                    yield _sse({
                        "type": "progress",
                        "content": labels.get(name, f"Running {name}..."),
                        "agent": name,
                    })

                # LLM token streaming
                elif kind == "on_chat_model_stream":
                    chunk = event["data"].get("chunk")
                    if chunk and hasattr(chunk, "content") and chunk.content:
                        accumulated_result.append(chunk.content)
                        yield _sse({
                            "type": "token",
                            "content": chunk.content,
                        })

                # Capture files_analyzed from analyze_code output
                elif kind == "on_chain_end" and name == "analyze_code":
                    output = event.get("data", {}).get("output", {})
                    if isinstance(output, dict):
                        files_count = output.get("files_analyzed", 0)

            yield _sse({
                "type": "result",
                "content": "".join(accumulated_result),
                "agent": detected_agent,
                "files_analyzed": files_count,
            })

        except Exception as exc:
            yield _sse({"type": "error", "content": str(exc)})

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
    if not Path(request.codebase_path).is_dir():
        raise HTTPException(
            status_code=400,
            detail=f"Directory not found: {request.codebase_path}",
        )

    result = await graph.ainvoke(
        {
            "command": request.command,
            "codebase_path": request.codebase_path,
            "intent": "",
            "code_context": "",
            "files_analyzed": 0,
            "messages": [],
            "result": "",
        }
    )

    return AnalyzeResponse(
        agent=result.get("intent", "unknown"),
        analysis=result.get("result", ""),
        files_analyzed=result.get("files_analyzed", 0),
    )
