"""LangGraph shared agent state definition."""

import operator
from typing import Annotated, Sequence, TypedDict

from langchain_core.messages import BaseMessage


class AgentState(TypedDict):
    """Shared state passed through all LangGraph nodes.

    Attributes:
        command: Original user command/request.
        codebase_path: Absolute path to the codebase directory.
        intent: Classified intent (dockerfile | testcase | bundlesize | production).
        code_context: Extracted code summary from AST analysis.
        files_analyzed: Number of source files scanned.
        messages: LLM conversation history (append-only via operator.add).
        result: Final output from the selected agent.
    """

    command: str
    codebase_path: str
    intent: str
    code_context: str
    files_analyzed: int
    messages: Annotated[Sequence[BaseMessage], operator.add]
    result: str
