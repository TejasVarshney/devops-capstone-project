"""Business metrics exposed on /metrics next to the HTTP metrics from the instrumentator."""

from prometheus_client import Counter

TASKS_CREATED = Counter(
    "taskboard_tasks_created_total", "Tasks created through the API", ["priority"]
)
TASKS_COMPLETED = Counter("taskboard_tasks_completed_total", "Tasks moved to the done status")
TASKS_DELETED = Counter("taskboard_tasks_deleted_total", "Tasks deleted through the API")
