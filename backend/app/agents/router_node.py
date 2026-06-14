"""Router node — resolves general vs specialist intent."""


from typing import Optional

from app.models.state import AgentState
from app.prompts.library import get_prompt
from app.llm import build_chat_model
from langchain_core.messages import HumanMessage, SystemMessage

SPECIALIST_INTENTS = {"dockerfile", "testcase", "bundlesize", "production"}

# Fast-path keyword map (checked before calling the LLM)
INTENT_KEYWORDS: dict[str, list[str]] = {
    "dockerfile": [
        "docker", "dockerfile", "container", "containerize",
        "containerise", "image", "dockerize", "dockerise",
    ],
    "testcase": [
        "test", "testing", "unittest", "unit test", "test case",
        "pytest", "jest", "spec", "coverage",
    ],
    "bundlesize": [
        "bundle", "size", "optimize", "optimise", "reduce",
        "minimize", "minimise", "package size", "dependency",
        "unused", "slim", "lightweight", "tree shaking",
    ],
    "production": [
        "production", "fail", "failure", "security", "vulnerability",
        "reliability", "deploy", "issue", "problem", "bug", "crash",
        "risk", "audit", "review",
    ],
}


def _normalize_intent(intent: str) -> Optional[str]:
    normalized = intent.strip().lower()
    if normalized == "general":
        return "general"
    return normalized if normalized in INTENT_KEYWORDS else None


def _response_to_text(content: object) -> str:
    if content is None:
        return ""
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return "".join(_response_to_text(item) for item in content)
    if isinstance(content, dict):
        if isinstance(content.get("content"), str):
            return content["content"]
        if isinstance(content.get("text"), str):
            return content["text"]
        return ""
    return str(content)


def _specialist_score(command: str) -> tuple[str, int]:
    best_intent = ""
    best_score = 0
    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in command)
        if score > best_score:
            best_intent = intent
            best_score = score
    return best_intent, best_score


def _is_strong_specialist_request(command: str) -> bool:
    _, score = _specialist_score(command)
    return score >= 2


def _history_to_text(history: list[dict[str, str]], limit: int = 10) -> str:
    if not history:
        return ""

    lines = []
    for item in history[-limit:]:
        role = item.get("role", "unknown")
        content = (item.get("content") or "").strip()
        if not content:
            continue
        agent = item.get("agent", "")
        agent_part = f" [{agent}]" if role == "assistant" and agent else ""
        lines.append(f"{role}{agent_part}: {content}")
    return "\n".join(lines)


async def router_node(state: AgentState) -> dict:
    """Resolve routing via explicit mode, context-aware auto, and general default."""
    command = state["command"].lower()

    # 1) Explicit mode override
    mode = state.get("mode", "auto")
    if mode == "general":
        return {"intent": "general", "routing_source": "explicit"}
    if mode in SPECIALIST_INTENTS:
        return {"intent": mode, "routing_source": "explicit"}

    classifier_prompt = get_prompt("routing-classifier")
    context_prompt = get_prompt("routing-context-aware")
    runtime = state["model_runtime"]

    # 2) Context-aware auto routing using recent history
    history_text = _history_to_text(state.get("conversation_history", []))
    if history_text:
        llm = build_chat_model(runtime=runtime, temperature=0)
        context_request = (
            f"Recent conversation:\n{history_text}\n\n"
            f"Latest user request:\n{state['command']}"
        )
        response = await llm.ainvoke(
            [
                SystemMessage(content=context_prompt),
                HumanMessage(content=context_request),
            ]
        )
        context_text = _response_to_text(response.content)
        context_intent = _normalize_intent(context_text)
        if context_intent:
            if context_intent in SPECIALIST_INTENTS and not _is_strong_specialist_request(command):
                return {"intent": "general", "routing_source": "general-default"}
            return {"intent": context_intent, "routing_source": "context-aware"}

    # 3) Keyword fallback
    intent, score = _specialist_score(command)
    if intent and score >= 2:
        return {"intent": intent, "routing_source": "keyword"}
    if intent and score > 0:
        return {"intent": "general", "routing_source": "general-default"}

    # 4) LLM fallback
        # "No keyword match found, using LLM fallback for intent classification")
    llm = build_chat_model(runtime=runtime, temperature=0)
    response = await llm.ainvoke(
        [
            SystemMessage(content=classifier_prompt),
            HumanMessage(content=state["command"]),
        ]
    )
    intent_text = _response_to_text(response.content)
    intent = _normalize_intent(intent_text)
    if intent is None:
        intent = "general"
    elif intent in SPECIALIST_INTENTS and not _is_strong_specialist_request(command):
        intent = "general"
        return {"intent": intent, "routing_source": "general-default"}
    return {"intent": intent, "routing_source": "llm-fallback"}
