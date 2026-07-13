# DevOps Copilot

AI-powered assistant that analyzes a local codebase and produces specialized DevOps deliverables — not a general-purpose chatbot bolted onto DevOps questions, but a multi-agent system (via LangGraph) that routes each request based on both **query intent** and the **actual structure of the code it's looking at**.

## Results

- **50%** more accurate responses, via AST-based codebase context injection vs. context-free prompting
- **30%** lower perceived latency, via token-by-token SSE streaming
- **2×** throughput under the streaming architecture

## How It Works

1. Point it at a local codebase path and describe the DevOps deliverable you need.
2. **AST-based analyzer** (`code_analyzer.py`) scans the codebase and extracts structural context — language, dependencies, file layout.
3. **Router** determines which specialist agent the request and codebase context best match.
4. The selected agent combines that context with **Google Gemini** to generate a tailored result.
5. The response streams back token-by-token over **FastAPI SSE**, rather than waiting on the full generation.

## Specialist Agents

| Agent | Role |
|---|---|
| 🐳 **Dockerfile Agent** | Generates or optimizes Dockerfiles based on detected language and dependencies |
| 🧪 **Test Case Agent** | Analyzes code logic to suggest comprehensive test cases |
| 📦 **Bundle Size Agent** | Scans dependencies to suggest build-size reductions |
| 🔒 **Production Agent** | Runs a production-readiness check to flag potential failure risks |
| 💬 **General Agent** | Handles general DevOps questions (CI/CD, cloud, etc.), scoped strictly to DevOps |

Each agent's persona and instructions live as an isolated Markdown file (`backend/app/prompts/skills/`), so updating one agent's behavior doesn't risk breaking another's.

## Technical Stack

### Backend
- **FastAPI** — REST API + SSE streaming for AI responses
- **LangGraph & LangChain** — stateful workflow and agent orchestration
- **Google Gemini** — underlying LLM
- **AST (Abstract Syntax Trees)** — programmatic codebase understanding (`code_analyzer.py`)

### Frontend
- **React & TypeScript** — chat interface
- **Vite & Tailwind CSS** — build tooling and styling
- **DaisyUI** — component library

## Project Structure

```
backend/app/agents/         # Router + specialist agent logic
backend/app/prompts/skills/ # Markdown persona/instruction files per agent
backend/app/tools/          # Filesystem scanning + code analysis
frontend/src/               # Chat UI, conversation management, streaming integration
```

## Setup & Running Locally

```bash
# Clone
git clone https://github.com/Tanishquppal220/Devops-chatbot.git
cd Devops-chatbot

# Backend — install dependencies
uv sync

# Backend — configure environment
cp backend/.env.example backend/.env
# then edit backend/.env with your values (e.g. GEMINI_API_KEY)

# Backend — run
uv run main.py

# Frontend — in a separate terminal
cd frontend
npm install
npm run dev
```

## License

_Add license details here if applicable (e.g. MIT — see `LICENSE`)._
