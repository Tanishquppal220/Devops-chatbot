"""Production failure analysis agent node."""


from langchain_core.messages import HumanMessage, SystemMessage

from app.llm import build_chat_model
from app.models.state import AgentState
from app.prompts.library import get_prompt


async def production_node(state: AgentState) -> dict:
    """Scan the codebase for production-failure risks with reasons and solutions."""
    runtime = state["model_runtime"]
    llm = build_chat_model(runtime=runtime, temperature=0.2)
    system_prompt = get_prompt("production")

    user_msg = (
        f"User request: {state['command']}\n\n"
        f"## Codebase Analysis\n{state['code_context']}"
    )

    response = await llm.ainvoke(
        [SystemMessage(content=system_prompt),
         HumanMessage(content=user_msg)]
    )
    return {"result": response.content, "messages": [response]}
