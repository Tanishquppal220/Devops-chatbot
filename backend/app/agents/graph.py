"""LangGraph StateGraph — the central orchestration workflow.

Flow:
    START → analyze_code → router → (general or one of 4 specialist agents) → END
"""

import logging

from langgraph.graph import END, START, StateGraph

from app.agents.bundlesize_agent import bundlesize_node
from app.agents.dockerfile_agent import dockerfile_node
from app.agents.general_agent import general_node
from app.agents.production_agent import production_node
from app.agents.router_node import router_node
from app.agents.testcase_agent import testcase_node
from app.models.state import AgentState
from app.tools.code_analyzer import analyze_codebase

logger = logging.getLogger("devops_chatbot.agents.graph")


# ── Shared node: analyse the codebase before routing ──────────────

async def analyze_code_node(state: AgentState) -> dict:
    """Run the AST-based code analyser and populate code_context."""
    if not state["codebase_path"].strip():
        logger.info("No codebase path provided, skipping code analysis")
        return {"code_context": "", "files_analyzed": 0}

    logger.info("Starting code analysis for %s", state["codebase_path"])
    context, count = analyze_codebase(state["codebase_path"])
    logger.info("Completed code analysis: files_analyzed=%s", count)
    return {"code_context": context, "files_analyzed": count}


# ── Conditional edge: pick the right agent ────────────────────────

def route_by_intent(state: AgentState) -> str:
    """Return the node name that matches the classified intent."""
    return state["intent"]


# ── Build & compile the graph ─────────────────────────────────────

def build_graph() -> StateGraph:
    """Construct and compile the LangGraph workflow."""
    workflow = StateGraph(AgentState)

    # Nodes
    workflow.add_node("analyze_code", analyze_code_node)
    workflow.add_node("router", router_node)
    workflow.add_node("general", general_node)
    workflow.add_node("dockerfile", dockerfile_node)
    workflow.add_node("testcase", testcase_node)
    workflow.add_node("bundlesize", bundlesize_node)
    workflow.add_node("production", production_node)

    # Edges
    workflow.add_edge(START, "analyze_code")
    workflow.add_edge("analyze_code", "router")
    workflow.add_conditional_edges(
        "router",
        route_by_intent,
        {
            "general": "general",
            "dockerfile": "dockerfile",
            "testcase": "testcase",
            "bundlesize": "bundlesize",
            "production": "production",
        },
    )
    workflow.add_edge("general", END)
    workflow.add_edge("dockerfile", END)
    workflow.add_edge("testcase", END)
    workflow.add_edge("bundlesize", END)
    workflow.add_edge("production", END)

    return workflow.compile()


# Singleton compiled graph
graph = build_graph()
