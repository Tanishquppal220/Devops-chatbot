"""Router node — classifies the user command into one of the four intents."""

from app.config import get_settings
from app.models.state import AgentState
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

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

_CLASSIFIER_PROMPT = """\
Classify the following user command into exactly ONE of these categories:
  dockerfile, testcase, bundlesize, production

Reply with ONLY the category name, nothing else.
"""


async def router_node(state: AgentState) -> dict:
    """Classify intent via keywords first, then LLM fallback."""
    command = state["command"].lower()

    # ── keyword scoring ───────────────────────────────────────────
    scores: dict[str, int] = {}
    for intent, keywords in INTENT_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in command)
        if score > 0:
            scores[intent] = score

    if scores:
        return {"intent": max(scores, key=scores.get)}

    # ── LLM fallback ──────────────────────────────────────────────
    settings = get_settings()
    llm = ChatGoogleGenerativeAI(
        model=settings.model_name,
        google_api_key=settings.google_api_key,
        temperature=0,
    )
    response = await llm.ainvoke(
        [
            SystemMessage(content=_CLASSIFIER_PROMPT),
            HumanMessage(content=state["command"]),
        ]
    )
    intent = response.content.strip().lower()
    if intent not in INTENT_KEYWORDS:
        intent = "production"  # safe default
    return {"intent": intent}
