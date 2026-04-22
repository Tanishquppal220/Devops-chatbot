"""Pydantic request/response schemas for the API."""

from typing import Literal

from pydantic import BaseModel, Field


class ConversationHistoryItem(BaseModel):
    """One prior chat message used for routing context."""

    role: Literal["user", "assistant"] = Field(..., description="Message role")
    content: str = Field(..., description="Message text")
    agent: str = Field(
        default="", description="Assistant agent, when available")


class AnalyzeRequest(BaseModel):
    """Request body for the /analyze endpoint."""

    command: str = Field(
        ...,
        description="User's natural language command",
        examples=["Generate a Dockerfile for this project"],
    )
    codebase_path: str = Field(
        default="",
        description="Optional absolute path to a codebase directory to analyze",
        examples=["/home/user/my-project", ""],
    )
    mode: Literal["auto", "general", "dockerfile", "testcase", "bundlesize", "production"] = Field(
        default="auto",
        description="Routing mode; explicit mode overrides auto classification",
    )
    conversation_history: list[ConversationHistoryItem] = Field(
        default_factory=list,
        description="Recent chat history for context-aware auto routing",
    )
    conversation_id: str = Field(
        default="",
        description="Optional existing conversation UUID; when omitted, a new conversation is created",
    )


class AnalyzeResponse(BaseModel):
    """Non-streaming response for the /analyze endpoint."""

    agent: str = Field(..., description="Which agent handled the request")
    analysis: str = Field(..., description="The LLM-generated analysis/output")
    files_analyzed: int = Field(
        ..., description="Number of source files scanned"
    )
    routing_source: str = Field(
        default="", description="How the final agent was selected")
    conversation_id: str = Field(
        default="", description="Conversation UUID associated with this exchange"
    )


class StreamEvent(BaseModel):
    """A single SSE event sent during streaming."""

    type: str = Field(
        ...,
        description="Event type: progress | token | error | done",
    )
    content: str = Field(default="", description="Event payload")
    agent: str = Field(default="", description="Active agent name")
    files_analyzed: int = Field(default=0, description="Files scanned so far")
    routing_source: str = Field(
        default="", description="How agent selection was resolved")


class ConversationCreateRequest(BaseModel):
    """Create conversation request body."""

    title: str = Field(default="New Chat", description="Conversation title")


class ConversationResponse(BaseModel):
    """Conversation metadata returned to clients."""

    id: str
    title: str
    created_at: str
    updated_at: str
    last_message_at: str


class StoredMessageResponse(BaseModel):
    """Stored chat message record."""

    id: str
    conversation_id: str
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    agent: str = ""
    message_order: int
    created_at: str
