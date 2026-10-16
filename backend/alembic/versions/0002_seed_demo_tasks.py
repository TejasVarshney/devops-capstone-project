"""seed demo tasks so the dashboard is not empty on first launch

Revision ID: 0002_seed_demo_tasks
Revises: 0001_create_tasks
Create Date: 2026-10-16
"""

from collections.abc import Sequence
from datetime import date, datetime, timedelta, timezone

import sqlalchemy as sa

from alembic import op

revision: str = "0002_seed_demo_tasks"
down_revision: str | None = "0001_create_tasks"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

# (title, description, status, priority, assignee, due in N days, created N hours ago, updated N hours ago)
DEMO_TASKS = [
    ("Write pytest suite for the task API", "Cover CRUD, validation and the stats endpoint.", "done", "high", "Priya Nair", -6, 140, 120),
    ("Containerize the FastAPI backend", "Slim Python base image, non-root user, migrations on start.", "done", "medium", "Rohan Mehta", -4, 130, 96),
    ("Add Trivy scan to the pipeline", "Fail the build on fixable HIGH and CRITICAL findings.", "review", "high", "Sara Khan", 1, 100, 20),
    ("Provision VPC and EKS with Terraform", "Two AZs, private node subnets, single NAT gateway.", "in_progress", "critical", "Aarav Shah", 2, 90, 6),
    ("Package TaskBoard as a Helm chart", "Backend, frontend, PostgreSQL StatefulSet, Ingress and HPA.", "in_progress", "high", "Rohan Mehta", 3, 80, 3),
    ("Route /api through the Ingress", "Frontend on /, FastAPI on /api, Swagger on /docs.", "todo", "medium", "Dev Patel", 5, 60, 60),
    ("Tune the HPA CPU target", "Run the load generator and watch the replica count.", "todo", "medium", "Sara Khan", 6, 50, 50),
    ("Build the Grafana request-rate dashboard", "Requests per second, p95 latency, 5xx rate, replicas.", "todo", "low", "Priya Nair", 8, 40, 40),
    ("Rotate the PostgreSQL credentials", "Move the password into a Kubernetes Secret managed outside Git.", "todo", "critical", "Aarav Shah", -1, 30, 30),
    ("Fix ImagePullBackOff in staging", "Wrong image tag in the Deployment; pin to the commit SHA.", "done", "high", "Dev Patel", -2, 20, 1),
]

tasks_table = sa.table(
    "tasks",
    sa.column("title", sa.String),
    sa.column("description", sa.Text),
    sa.column("status", sa.String),
    sa.column("priority", sa.String),
    sa.column("assignee", sa.String),
    sa.column("due_date", sa.Date),
    sa.column("created_at", sa.DateTime(timezone=True)),
    sa.column("updated_at", sa.DateTime(timezone=True)),
)


def upgrade() -> None:
    today = date.today()
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        tasks_table,
        [
            {
                "title": title,
                "description": description,
                "status": status,
                "priority": priority,
                "assignee": assignee,
                "due_date": today + timedelta(days=due_in),
                "created_at": now - timedelta(hours=created_ago),
                "updated_at": now - timedelta(hours=updated_ago),
            }
            for title, description, status, priority, assignee, due_in, created_ago, updated_ago in DEMO_TASKS
        ],
    )


def downgrade() -> None:
    op.execute(tasks_table.delete().where(tasks_table.c.title.in_([t[0] for t in DEMO_TASKS])))
