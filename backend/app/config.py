"""Application configuration loaded from environment variables."""

from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from .env file."""

    # Cloud provider (Google)
    google_api_key: str = ""
    cloud_model_name: str = "gemini-2.0-flash"

    # Edge provider (LM Studio OpenAI-compatible API)
    lmstudio_base_url: str = "http://127.0.0.1:1234/v1"
    lmstudio_api_key: str = "lm-studio"
    edge_model_name: str = ""

    # Backward compatibility fallback for older .env files.
    model_name: str = ""
    sqlite_db_path: str = "./data/devops_chatbot.db"

    model_config = {
        "env_file": ".env",
        "env_file_encoding": "utf-8",
        # Allow legacy keys like MODEL_PROVIDER to coexist during migration.
        "extra": "ignore",
    }


@lru_cache
def get_settings() -> Settings:
    """Return cached settings singleton."""
    return Settings()
