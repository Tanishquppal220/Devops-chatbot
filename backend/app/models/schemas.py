"""Pydantic request/response schemas for the API."""

from pydantic import BaseModel, Field


class AnalyzeRequest(BaseModel):
    """Request body for the /analyze endpoint."""

    command: str = Field(
        ...,
        description="User's natural language command",
        examples=["Generate a Dockerfile for this project"],
    )
    codebase_path: str = Field(
        ...,
        description="Absolute path to the codebase directory to analyze",
        examples=["/home/user/my-project"],
    )


class AnalyzeResponse(BaseModel):
    """Non-streaming response for the /analyze endpoint."""

    agent: str = Field(..., description="Which agent handled the request")
    analysis: str = Field(..., description="The LLM-generated analysis/output")
    files_analyzed: int = Field(
        ..., description="Number of source files scanned"
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
