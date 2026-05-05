"""General DevOps chat agent node."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.llm import build_chat_model
from app.models.state import AgentState
from app.prompts.library import get_prompt

logger = logging.getLogger("devops_chatbot.agents.general_agent")


async def general_node(state: AgentState) -> dict:
    """Answer general DevOps questions and only use DevOps scope."""
    runtime = state["model_runtime"]
    logger.info(
        "Starting general agent for command=%s runtime=%s",
        state["command"],
        runtime,
    )
    llm = build_chat_model(runtime=runtime, temperature=0.2)
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
