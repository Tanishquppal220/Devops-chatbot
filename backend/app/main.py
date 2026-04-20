"""FastAPI application — DevOps Chatbot Backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application startup / shutdown hooks."""
    # Validate critical settings on startup
    settings = get_settings()
    if not settings.google_api_key:
        print(
            "\n⚠️  WARNING: GOOGLE_API_KEY is not set. "
            "Create a .env file (see .env.example).\n"
        )
    else:
        print(f"\n✅ DevOps Chatbot Backend ready — model: {settings.model_name}\n")
    yield
    print("\n🛑 Shutting down…\n")


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
