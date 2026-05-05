"""Test-case generation agent node."""

import logging

from langchain_core.messages import HumanMessage, SystemMessage

from app.llm import build_chat_model
from app.models.state import AgentState
from app.prompts.library import get_prompt

logger = logging.getLogger("devops_chatbot.agents.testcase_agent")


async def testcase_node(state: AgentState) -> dict:
    """Generate comprehensive test cases for the codebase."""
    runtime = state["model_runtime"]
    logger.info(
        "Starting testcase agent for command=%s runtime=%s",
        state["command"],
        runtime,
    )
    llm = build_chat_model(runtime=runtime, temperature=0.4)
    system_prompt = get_prompt("testcase")

    user_msg = (
        f"User request: {state['command']}\n\n"
        f"## Codebase Analysis\n{state['code_context']}"
    )

    logger.info("Invoking model for testcase generation")
    response = await llm.ainvoke(
        [SystemMessage(content=system_prompt), HumanMessage(content=user_msg)]
    )
    logger.info(
        "Testcase agent completed; response length=%s",
        len(response.content) if response.content else 0,
    )
    return {"result": response.content, "messages": [response]}

