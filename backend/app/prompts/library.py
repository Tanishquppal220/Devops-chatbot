"""Markdown prompt library loader with lazy cache and frontmatter parsing."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger("devops_chatbot.prompts.library")

_PROMPT_CACHE: dict[str, str] = {}
_PROMPT_META_CACHE: dict[str, dict[str, Any]] = {}

_SKILLS_DIR = Path(__file__).resolve().parent / "skills"

_FALLBACK_PROMPT = (
    "You are a senior DevOps assistant. Answer only DevOps-related questions "
    "with practical, concise guidance. If the request is unrelated to DevOps, "
    "politely refuse and ask for a DevOps-focused question."
)


def _parse_frontmatter(raw: str) -> tuple[dict[str, Any], str]:
    """Parse simple YAML frontmatter and return (meta, content)."""
    if not raw.startswith("---\n"):
        return {}, raw

    end = raw.find("\n---\n", 4)
    if end == -1:
        return {}, raw

    meta_block = raw[4:end]
    body = raw[end + 5:]

    meta: dict[str, Any] = {}
    for line in meta_block.splitlines():
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        if ":" not in stripped:
            continue
        key, value = stripped.split(":", 1)
        key = key.strip()
        value = value.strip()

        if value.startswith("[") and value.endswith("]"):
            parts = [p.strip().strip("'\"")
                     for p in value[1:-1].split(",") if p.strip()]
            meta[key] = parts
        else:
            meta[key] = value.strip("'\"")

    return meta, body


def list_available_prompts() -> list[str]:
    """Return available markdown prompt names from skills directory."""
    if not _SKILLS_DIR.exists():
        return []
    return sorted(p.stem for p in _SKILLS_DIR.glob("*.md") if p.is_file())


def get_prompt_metadata(name: str) -> dict[str, Any]:
    """Return cached metadata for a prompt, loading prompt if needed."""
    if name not in _PROMPT_META_CACHE:
        get_prompt(name)
    return _PROMPT_META_CACHE.get(name, {})


def get_prompt(name: str) -> str:
    """Lazy-load a prompt markdown file by name and return prompt body text."""
    if name in _PROMPT_CACHE:
        return _PROMPT_CACHE[name]

    prompt_path = _SKILLS_DIR / f"{name}.md"
    try:
        raw = prompt_path.read_text(encoding="utf-8")
        meta, content = _parse_frontmatter(raw)
        prompt = content.strip()
        if not prompt:
            raise ValueError("prompt body is empty")

        _PROMPT_CACHE[name] = prompt
        _PROMPT_META_CACHE[name] = meta
        logger.info("Loaded prompt '%s' from %s", name, prompt_path)
        return prompt
    except Exception as exc:
        logger.warning(
            "Failed to load prompt '%s' from %s (%s). Using fallback prompt.",
            name,
            prompt_path,
            exc,
        )
        _PROMPT_CACHE[name] = _FALLBACK_PROMPT
        _PROMPT_META_CACHE[name] = {"fallback": "true", "name": name}
        return _FALLBACK_PROMPT
