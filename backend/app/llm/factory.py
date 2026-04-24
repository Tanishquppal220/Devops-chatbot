"""Factory for chat model providers without changing agent architecture."""

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.config import get_settings


def build_chat_model(*, temperature: float) -> BaseChatModel:
    """Build chat model from configured provider."""
    settings = get_settings()
    provider = settings.model_provider.strip().lower()

    if provider == "google":
        return ChatGoogleGenerativeAI(
            model=settings.model_name,
            google_api_key=settings.google_api_key,
            temperature=temperature,
        )

    if provider in {"lmstudio", "lm-studio"}:
        return ChatOpenAI(
            model=settings.model_name,
            base_url=settings.lmstudio_base_url,
            api_key=settings.lmstudio_api_key,
            temperature=temperature,
        )

    raise ValueError(
        f"Unsupported MODEL_PROVIDER='{settings.model_provider}'. "
        "Use 'google' or 'lmstudio'."
    )
