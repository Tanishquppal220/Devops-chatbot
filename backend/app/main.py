"""FastAPI application — DevOps Chatbot Backend."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.config import get_settings
from app.prompts.library import list_available_prompts
from app.storage.sqlite_store import get_chat_store

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s: %(message)s",
)
logger = logging.getLogger("devops_chatbot")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown hooks."""
    chat_store = get_chat_store()
    chat_store.init_schema()

    # Validate critical settings on startup
    settings = get_settings()
    if not settings.google_api_key:
        logger.warning(
            "GOOGLE_API_KEY is not set. Create a .env file (see .env.example)."
        )
    else:
        logger.info("DevOps Chatbot Backend ready — model: %s",
                    settings.model_name)

    prompt_names = list_available_prompts()
    logger.info(
        "Prompt library initialized (lazy-load): %s prompt files discovered",
        len(prompt_names),
    )
    logger.debug("Prompt catalog: %s", ", ".join(prompt_names))
    yield
    logger.info("Shutting down...")


def create_app() -> FastAPI:
    """Factory function that builds the FastAPI application."""
    app = FastAPI(
        title="DevOps Chatbot API",
        description=(
            "AI-powered backend that analyses codebases to generate Dockerfiles, "
            "write test cases, optimise bundle sizes, and detect production risks."
        ),
        version="0.1.0",
        lifespan=lifespan,
    )

    # ── CORS (allow frontend dev servers) ─────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # tighten in production
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routes ────────────────────────────────────────────────────
    app.include_router(api_router)

    @app.get("/health", tags=["system"])
    async def health_check():
        """Lightweight liveness probe."""
        return {"status": "healthy", "version": "0.1.0"}

    return app


app = create_app()
