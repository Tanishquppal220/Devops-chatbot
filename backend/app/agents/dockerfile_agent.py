"""Dockerfile generation / optimisation agent node."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.llm import build_chat_model
from app.models.state import AgentState
from app.prompts.library import get_prompt

logger = logging.getLogger("devops_chatbot.agents.dockerfile_agent")


async def dockerfile_node(state: AgentState) -> dict:
    """Analyze the codebase and generate or optimise a Dockerfile."""
    runtime = state["model_runtime"]
    logger.info(
        "Starting Dockerfile agent for command=%s runtime=%s",
        state["command"],
        runtime,
    )
    llm = build_chat_model(runtime=runtime, temperature=0.3)
    system_prompt = get_prompt("dockerfile")

    user_msg = (
        f"User request: {state['command']}\n\n"
        f"## Codebase Analysis\n{state['code_context']}"
    )

    logger.info("Invoking model for Dockerfile generation")
    response = await llm.ainvoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=user_msg)]
    )
    logger.info(
        "Dockerfile agent completed; response length=%s",
        len(response.content) if response.content else 0,
    )
    return {"result": response.content, "messages": [response]}

