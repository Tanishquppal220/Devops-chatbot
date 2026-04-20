"""Bundle-size / dependency optimisation agent node."""

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.models.state import AgentState
from app.prompts.bundlesize import SYSTEM_PROMPT


async def bundlesize_node(state: AgentState) -> dict:
    """Analyse dependencies and suggest bundle-size reductions."""
    settings = get_settings()
    llm = ChatGoogleGenerativeAI(
        model=settings.model_name,
        google_api_key=settings.google_api_key,
        temperature=0.3,
    )

    user_msg = (
        f"User request: {state['command']}\n\n"
        f"## Codebase Analysis\n{state['code_context']}"
    )

    response = await llm.ainvoke(
        [SystemMessage(content=SYSTEM_PROMPT), HumanMessage(content=user_msg)]
    )
    return {"result": response.content, "messages": [response]}
