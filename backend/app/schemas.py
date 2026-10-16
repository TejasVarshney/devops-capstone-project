"""Pydantic schemas: the public contract of the REST API."""

from datetime import date, datetime, timezone
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

TaskStatus = Literal["todo", "in_progress", "review", "done"]
TaskPriority = Literal["low", "medium", "high", "critical"]


class _TaskFields(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True)

    @field_validator("description", "assignee", mode="before", check_fields=False)
    @classmethod
    def _blank_to_none(cls, value):
        # The UI sends "" for empty optional inputs; store those as NULL.
        if isinstance(value, str) and not value.strip():
            return None
        return value


class TaskBase(_TaskFields):
    title: str = Field(min_length=1, max_length=200, examples=["Configure HPA for the backend"])
    description: str | None = Field(default=None, max_length=5000)
    status: TaskStatus = "todo"
    priority: TaskPriority = "medium"
    assignee: str | None = Field(default=None, max_length=100)
    due_date: date | None = None


class TaskCreate(TaskBase):
    """Payload for POST /api/tasks."""


class TaskUpdate(_TaskFields):
    """Payload for PUT /api/tasks/{id}. Only the fields that are sent are changed."""

    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=5000)
    status: TaskStatus | None = None
    priority: TaskPriority | None = None
    assignee: str | None = Field(default=None, max_length=100)
    due_date: date | None = None

    @field_validator("title", "status", "priority")
    @classmethod
    def _reject_null(cls, value):
        if value is None:
            raise ValueError("may be omitted, but cannot be null")
        return value


class TaskRead(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime

    @field_validator("created_at", "updated_at")
    @classmethod
    def _assume_utc(cls, value: datetime) -> datetime:
        # Timestamps are stored in UTC. Some drivers (SQLite) return them without a
        # timezone; make that explicit so browsers do not read them as local time.
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)


class TaskStats(BaseModel):
    total: int
    by_status: dict[str, int]
    by_priority: dict[str, int]
    completion_rate: float = Field(description="Percentage of tasks that are done (0-100).")
    overdue: int = Field(description="Open tasks whose due date is in the past.")
    high_priority_open: int = Field(description="Open tasks with high or critical priority.")
