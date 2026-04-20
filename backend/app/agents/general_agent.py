"""General DevOps chat agent node."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.models.state import AgentState
from app.prompts.library import get_prompt

logger = logging.getLogger("devops_chatbot.agents.general_agent")


async def general_node(state: AgentState) -> dict:
    """Answer general DevOps questions and only use DevOps scope."""
    settings = get_settings()
    logger.info(
        "Starting general agent for command=%s using model=%s",
        state["command"],
        settings.model_name,
    )
    llm = ChatGoogleGenerativeAI(
        model=settings.model_name,
        google_api_key=settings.google_api_key,
        temperature=0.2,
    )
    system_prompt = get_prompt("general")

    user_msg = (
        f"User request: {state['command']}\n\n"
        f"## Codebase Analysis\n{state['code_context']}"
    )

    logger.info("Invoking model for general DevOps chat response")
    response = await llm.ainvoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=user_msg)]
    )
    logger.info(
        "General agent completed; response length=%s",
        len(response.content) if response.content else 0,
    )
    return {"result": response.content, "messages": [response]}
