# DevOps Copilot

DevOps Copilot is an AI-powered assistant designed to analyze local codebases and provide specialized DevOps guidance.

Unlike a general-purpose chatbot, this tool uses multi-agent orchestration (via LangGraph) to route user requests to specific specialist agents based on the intent of the query and the actual structure of the provided code.

## Core Functionality

The application allows a user to provide a path to a local codebase and ask for specific DevOps deliverables. The system then:

- **Analyzes the code**: Uses an AST-based analyzer to scan the codebase and extract context.
- **Routes the request**: A router determines which specialist agent is best suited for the task.
- **Generates output**: The selected agent uses a Google Gemini model to produce a tailored result.

## Specialist Agents

The repository implements five distinct agent roles:

- 🐳 **Dockerfile Agent**: Generates or optimizes Dockerfiles based on the detected language and dependencies.
- 🧪 **Test Case Agent**: Analyzes the logic to suggest comprehensive test cases.
- 📦 **Bundle Size Agent**: Scans dependencies to suggest ways to reduce the final build size.
- 🔒 **Production Agent**: Performs a production readiness check to identify potential failure risks.
- 💬 **General Agent**: Handles general DevOps questions (CI/CD, cloud, etc.) within a strict DevOps scope.

## Technical Stack

### Backend

- **FastAPI**: Provides the REST API and SSE (Server-Sent Events) for streaming AI responses.
- **LangGraph & LangChain**: Manages the stateful workflow and agent orchestration.
- **Google Gemini**: The underlying LLM for intelligence.
- **AST (Abstract Syntax Trees)**: Used in `code_analyzer.py` to programmatically understand Python codebases.

### Frontend

- **React & TypeScript**: A modern chat interface.
- **Vite & Tailwind CSS**: For fast builds and responsive styling.
- **DaisyUI**: The UI component library.

## Project Structure

- `backend/app/agents/`: Contains the logic for the router and the specialist nodes.
- `backend/app/prompts/skills/`: Markdown files that define the persona and instructions for each agent.
- `backend/app/tools/`: Logic for scanning the local filesystem and analyzing code.
- `frontend/src/`: The chat UI, including conversation management and streaming integration.
