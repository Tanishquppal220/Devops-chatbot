"""LangGraph shared agent state definition."""

import operator
from typing import Annotated, Literal, Sequence, TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """Shared state passed through all LangGraph nodes.

    Attributes:
        command: Original user command/request.
        codebase_path: Absolute path to the codebase directory.
        mode: Requested routing mode (auto or explicit agent mode).
        model_runtime: Runtime selected from UI (cloud | edge).
        conversation_history: Recent messages used for context-aware routing.
        intent: Classified intent (general | dockerfile | testcase | bundlesize | production).
        routing_source: How routing was resolved (explicit | context-aware | keyword | llm-fallback | general-default).
        code_context: Extracted code summary from AST analysis.
        files_analyzed: Number of source files scanned.
        messages: LLM conversation history (append-only via operator.add).
        result: Final output from the selected agent.
    """

    command: str
    codebase_path: str
    mode: Literal["auto", "general", "dockerfile",
                  "testcase", "bundlesize", "production"]
    model_runtime: Literal["cloud", "edge"]
    conversation_history: list[dict[str, str]]
    intent: str
    routing_source: str
    code_context: str
    files_analyzed: int
    messages: Annotated[Sequence[BaseMessage], operator.add]
    result: str
