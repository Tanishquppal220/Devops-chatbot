"""Runtime checks for cloud/edge model backends."""

from __future__ import annotations

import json

from urllib.error import URLError
from urllib.request import Request, urlopen

from app.config import get_settings


def get_edge_runtime_status() -> dict:
    """Return LM Studio runtime status and whether configured edge model is active."""
    settings = get_settings()
    base_url = settings.lmstudio_base_url.rstrip("/")
    models_url = f"{base_url}/models"
    configured_model = settings.edge_model_name.strip() or settings.model_name.strip()

    headers: dict[str, str] = {}
    if settings.lmstudio_api_key.strip():
        headers["Authorization"] = f"Bearer {settings.lmstudio_api_key.strip()}"

    request = Request(models_url, headers=headers, method="GET")
    try:
        with urlopen(request, timeout=3) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except URLError as exc:
        return {
            "active": False,
            "reachable": False,
            "configured_model": configured_model,
            "loaded_models": [],
            "reason": f"Cannot reach LM Studio at {models_url}",
        }
    except Exception as exc:
        return {
            "active": False,
            "reachable": True,
            "configured_model": configured_model,
            "loaded_models": [],
            "reason": "LM Studio returned an invalid models response",
        }

    loaded_models = [
        item.get("id", "")
        for item in payload.get("data", [])
        if isinstance(item, dict) and isinstance(item.get("id"), str)
    ]

    if configured_model:
        active = configured_model in loaded_models
        reason = (
            ""
            if active
            else f"Configured edge model '{configured_model}' is not active in LM Studio"
        )
    else:
        active = len(loaded_models) > 0
        reason = "" if active else "No active model in LM Studio"

    return {
        "active": active,
        "reachable": True,
        "configured_model": configured_model,
        "loaded_models": loaded_models,
        "reason": reason,
    }
