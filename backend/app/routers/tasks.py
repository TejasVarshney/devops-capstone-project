"""REST endpoints for /api/tasks."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.metrics import TASKS_COMPLETED, TASKS_CREATED, TASKS_DELETED
from app.models import Task
from app.schemas import TaskCreate, TaskPriority, TaskRead, TaskStats, TaskStatus, TaskUpdate

router = APIRouter(prefix="/api/tasks", tags=["tasks"])

DbSession = Annotated[Session, Depends(get_db)]


def _get_or_404(db: Session, task_id: int) -> Task:
    task = crud.get_task(db, task_id)
    if task is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Task {task_id} not found")
    return task


@router.get("", response_model=list[TaskRead], summary="List tasks")
def list_tasks(
    db: DbSession,
    status_filter: Annotated[TaskStatus | None, Query(alias="status")] = None,
    priority: TaskPriority | None = None,
    search: Annotated[str | None, Query(max_length=100)] = None,
    limit: Annotated[int, Query(ge=1, le=500)] = 100,
    offset: Annotated[int, Query(ge=0)] = 0,
):
    return crud.list_tasks(
        db, status=status_filter, priority=priority, search=search, limit=limit, offset=offset
    )


# Declared before "/{task_id}" so that "stats" is never parsed as a task id.
@router.get("/stats", response_model=TaskStats, summary="Dashboard statistics")
def task_stats(db: DbSession):
    return crud.task_stats(db)


@router.get("/{task_id}", response_model=TaskRead, summary="Get one task")
def get_task(task_id: int, db: DbSession):
    return _get_or_404(db, task_id)


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED, summary="Create a task")
def create_task(payload: TaskCreate, db: DbSession):
    task = crud.create_task(db, payload)
    TASKS_CREATED.labels(priority=task.priority).inc()
    if task.status == "done":
        TASKS_COMPLETED.inc()
    return task


@router.put("/{task_id}", response_model=TaskRead, summary="Update a task")
def update_task(task_id: int, payload: TaskUpdate, db: DbSession):
    task = _get_or_404(db, task_id)
    was_done = task.status == "done"
    task = crud.update_task(db, task, payload)
    if task.status == "done" and not was_done:
        TASKS_COMPLETED.inc()
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete a task")
def delete_task(task_id: int, db: DbSession):
    crud.delete_task(db, _get_or_404(db, task_id))
    TASKS_DELETED.inc()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
