"""Database operations for tasks. Routers stay thin; the SQL lives here."""

from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.models import TASK_PRIORITIES, TASK_STATUSES, Task
from app.schemas import TaskCreate, TaskUpdate


def list_tasks(
    db: Session,
    *,
    status: str | None = None,
    priority: str | None = None,
    search: str | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Task]:
    query = select(Task)
    if status:
        query = query.where(Task.status == status)
    if priority:
        query = query.where(Task.priority == priority)
    if search:
        pattern = f"%{search.strip()}%"
        query = query.where(
            or_(
                Task.title.ilike(pattern),
                Task.description.ilike(pattern),
                Task.assignee.ilike(pattern),
            )
        )
    query = query.order_by(Task.created_at.desc(), Task.id.desc()).limit(limit).offset(offset)
    return list(db.scalars(query))


def get_task(db: Session, task_id: int) -> Task | None:
    return db.get(Task, task_id)


def create_task(db: Session, payload: TaskCreate) -> Task:
    task = Task(**payload.model_dump())
    db.add(task)
    db.commit()
    db.refresh(task)
    return task


def update_task(db: Session, task: Task, payload: TaskUpdate) -> Task:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task: Task) -> None:
    db.delete(task)
    db.commit()


def task_stats(db: Session) -> dict:
    by_status = dict.fromkeys(TASK_STATUSES, 0)
    by_status.update(db.execute(select(Task.status, func.count()).group_by(Task.status)).all())

    by_priority = dict.fromkeys(TASK_PRIORITIES, 0)
    by_priority.update(
        db.execute(select(Task.priority, func.count()).group_by(Task.priority)).all()
    )

    total = sum(by_status.values())
    open_tasks = Task.status != "done"
    overdue = db.scalar(
        select(func.count()).select_from(Task).where(open_tasks, Task.due_date < date.today())
    )
    high_priority_open = db.scalar(
        select(func.count())
        .select_from(Task)
        .where(open_tasks, Task.priority.in_(("high", "critical")))
    )

    return {
        "total": total,
        "by_status": by_status,
        "by_priority": by_priority,
        "completion_rate": round(by_status["done"] / total * 100, 1) if total else 0.0,
        "overdue": overdue or 0,
        "high_priority_open": high_priority_open or 0,
    }
