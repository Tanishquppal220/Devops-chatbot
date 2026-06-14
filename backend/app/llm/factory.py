"""Factory for chat model providers without changing agent architecture."""

from typing import Literal

from langchain_core.language_models.chat_models import BaseChatModel
from langchain_aws import ChatBedrock
# from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI

from app.config import get_settings

ModelRuntime = Literal["cloud", "edge"]


def _resolve_cloud_model_name() -> str:
    settings = get_settings()
    return (settings.cloud_model_name.strip() or settings.model_name.strip() or "gemini-2.0-flash")


def _resolve_edge_model_name() -> str:
    settings = get_settings()
    return settings.edge_model_name.strip() or settings.model_name.strip()


def build_chat_model(*, runtime: ModelRuntime, temperature: float) -> BaseChatModel:
    """Build chat model from per-request runtime selection."""
    settings = get_settings()

    if runtime == "cloud":
        # return ChatGoogleGenerativeAI(
        #     model=_resolve_cloud_model_name(),
        #     google_api_key=settings.google_api_key,
        #     temperature=temperature,
        # )
        return ChatBedrock(
            model=_resolve_cloud_model_name(),
            region_name=settings.aws_region,
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            temperature=temperature,
        )

    if runtime == "edge":
        edge_model = _resolve_edge_model_name()
        if not edge_model:
            raise ValueError(
                "No edge model configured. Set EDGE_MODEL_NAME (or fallback MODEL_NAME) in .env."
            )
        return ChatOpenAI(
            model=edge_model,
            base_url=settings.lmstudio_base_url,
            api_key=settings.lmstudio_api_key,
            temperature=temperature,
        )

    raise ValueError(f"Unsupported runtime '{runtime}'. Use 'cloud' or 'edge'.")
