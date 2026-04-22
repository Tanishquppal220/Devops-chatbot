"""SQLite chat persistence store with UUID-based IDs."""

from __future__ import annotations

import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Any
from uuid import uuid4

from app.config import get_settings


class ChatStore:
    """Simple SQLite-backed store for conversations and messages."""

    def __init__(self, db_path: str) -> None:
        self.db_path = Path(db_path)
        self.db_path.parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        self._lock = Lock()

    @staticmethod
    def _now() -> str:
        return datetime.now(timezone.utc).isoformat()

    def init_schema(self) -> None:
        """Create database schema if it does not already exist."""
        with self._lock:
            self._conn.executescript(
                """
                PRAGMA journal_mode=WAL;
                PRAGMA foreign_keys=ON;

                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL,
                    last_message_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL CHECK(role IN ('user','assistant','system','tool')),
                    content TEXT NOT NULL,
                    agent TEXT NOT NULL DEFAULT '',
                    message_order INTEGER NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
                    UNIQUE(conversation_id, message_order)
                );

                CREATE INDEX IF NOT EXISTS idx_conversations_last_message
                    ON conversations(last_message_at DESC);
                CREATE INDEX IF NOT EXISTS idx_messages_conversation_order
                    ON messages(conversation_id, message_order);
                """
            )
            self._conn.commit()

    def create_conversation(self, title: str) -> dict[str, Any]:
        conversation_id = str(uuid4())
        now = self._now()
        with self._lock:
            self._conn.execute(
                """
                INSERT INTO conversations (id, title, created_at, updated_at, last_message_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (conversation_id, title, now, now, now),
            )
            self._conn.commit()
        return {
            "id": conversation_id,
            "title": title,
            "created_at": now,
            "updated_at": now,
            "last_message_at": now,
        }

    def get_conversation(self, conversation_id: str) -> dict[str, Any] | None:
        row = self._conn.execute(
            "SELECT * FROM conversations WHERE id = ?",
            (conversation_id,),
        ).fetchone()
        if row is None:
            return None
        return dict(row)

    def list_conversations(self, limit: int = 100) -> list[dict[str, Any]]:
        rows = self._conn.execute(
            """
            SELECT *
            FROM conversations
            ORDER BY last_message_at DESC
            LIMIT ?
            """,
            (limit,),
        ).fetchall()
        return [dict(r) for r in rows]

    def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        agent: str = "",
    ) -> dict[str, Any]:
        message_id = str(uuid4())
        now = self._now()
        with self._lock:
            next_order = self._conn.execute(
                """
                SELECT COALESCE(MAX(message_order), 0) + 1 AS next_order
                FROM messages
                WHERE conversation_id = ?
                """,
                (conversation_id,),
            ).fetchone()["next_order"]

            self._conn.execute(
                """
                INSERT INTO messages (
                    id, conversation_id, role, content, agent, message_order, created_at
                )
                VALUES (?, ?, ?, ?, ?, ?, ?)
                """,
                (message_id, conversation_id, role, content, agent, next_order, now),
            )
            self._conn.execute(
                """
                UPDATE conversations
                SET updated_at = ?, last_message_at = ?
                WHERE id = ?
                """,
                (now, now, conversation_id),
            )
            self._conn.commit()

        return {
            "id": message_id,
            "conversation_id": conversation_id,
            "role": role,
            "content": content,
            "agent": agent,
            "message_order": next_order,
            "created_at": now,
        }

    def list_messages(
        self,
        conversation_id: str,
        limit: int | None = None,
    ) -> list[dict[str, Any]]:
        if limit is None:
            rows = self._conn.execute(
                """
                SELECT *
                FROM messages
                WHERE conversation_id = ?
                ORDER BY message_order ASC
                """,
                (conversation_id,),
            ).fetchall()
            return [dict(r) for r in rows]

        rows = self._conn.execute(
            """
            SELECT *
            FROM (
                SELECT *
                FROM messages
                WHERE conversation_id = ?
                ORDER BY message_order DESC
                LIMIT ?
            )
            ORDER BY message_order ASC
            """,
            (conversation_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]

    def delete_conversation(self, conversation_id: str) -> bool:
        """Delete one conversation and all associated messages."""
        with self._lock:
            result = self._conn.execute(
                "DELETE FROM conversations WHERE id = ?",
                (conversation_id,),
            )
            self._conn.commit()
            return result.rowcount > 0


_store: ChatStore | None = None


def get_chat_store() -> ChatStore:
    """Return singleton chat store instance."""
    global _store
    if _store is None:
        settings = get_settings()
        _store = ChatStore(settings.sqlite_db_path)
    return _store
