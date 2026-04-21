# FAQ

This codebase makes the life of a DevOps engineer significantly easier by automating the "context-gathering" and "boilerplate-generation" phases of the software delivery lifecycle.

Instead of a DevOps engineer manually auditing a repository to write a Dockerfile or identify production risks, this tool uses an AST-based code analyzer and specialized AI agents to do the heavy lifting.

## How does this project provide value?

### 1. Automation of repetitive tasks (specialist agents)
The codebase implements a multi-agent architecture via LangGraph, where specific agents handle common DevOps pain points:

- `dockerfile_agent.py`: Eliminates the manual effort of analyzing a project's language, version, and dependencies to write a Dockerfile. It generates optimized images based on the actual codebase analysis.
- `production_agent.py`: Acts as an automated "Production Readiness Review" (PRR). It scans for risks such as missing environment variables, hardcoded secrets, or inefficient resource usage before code hits production.
- `bundlesize_agent.py`: Helps optimize the build phase of CI/CD by identifying bloated dependencies, which directly reduces deployment time and storage costs.
- `testcase_agent.py`: Bridges the gap between Dev and Ops by suggesting comprehensive test cases, ensuring that the infrastructure is supporting a stable application.

### 2. Elimination of "context copy-pasting"
One of the biggest frictions in using LLMs for DevOps is providing the AI with the right context. This codebase solves this via `backend/app/tools/code_analyzer.py`:

- **AST analysis**: It doesn't just read files as text; it uses Python's `ast` module to visit classes, functions, and imports.
- **Automatic context injection**: The `analyze_code_node` function in `graph.py` automatically scans the local directory and feeds the structural summary into the LLM. The DevOps engineer just provides a path, and the tool handles the "reading" of the code.

### 3. Intelligent routing (reduced prompt engineering)
The `router_node.py` ensures the engineer doesn't have to spend time crafting complex prompts to get the right output.

- It classifies the intent (for example, "I need a Dockerfile" → `dockerfile_agent`).
- It supports context-aware routing, meaning it remembers the conversation history to maintain continuity in a troubleshooting session.

### 4. Practical DevOps workflow integration
The technical stack is designed for easy deployment and usage:

- **FastAPI + SSE (Server-Sent Events)**: The use of streaming responses (`analyze_stream` in `routes.py`) means the engineer gets real-time feedback as the AI analyzes the code, rather than waiting for a long-running process to finish.
- **Modular prompt library**: Prompts are stored as Markdown files in `backend/app/prompts/skills/`. This allows a DevOps team to tune the AI's behavior (for example, adding company-specific security standards to the `production.md` prompt) without changing the Python code.

## Summary: manual vs. Copilot workflow

| Task | Manual DevOps Workflow | With this Codebase |
| --- | --- | --- |
| Containerization | Read `package.json`/`requirements.txt` → Write Dockerfile → Test | Provide path → Get optimized Dockerfile |
| Prod Readiness | Manual audit of config files and code patterns | Run production agent → Get risk report |
| Dependency Audit | Run `npm list` or `pip freeze` → Research alternatives | Run bundlesize agent → Get optimization tips |
| Knowledge Base | Search documentation / StackOverflow for DevOps patterns | Ask general agent for concise, scoped guidance |
