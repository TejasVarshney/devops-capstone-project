from datetime import date, timedelta


def test_list_is_empty_initially(client):
    response = client.get("/api/tasks")
    assert response.status_code == 200
    assert response.json() == []


def test_create_task_returns_201_and_defaults(client):
    response = client.post("/api/tasks", json={"title": "  Set up GitHub Actions  "})

    assert response.status_code == 201
    task = response.json()
    assert task["id"] > 0
    assert task["title"] == "Set up GitHub Actions"
    assert task["status"] == "todo"
    assert task["priority"] == "medium"
    # Timestamps always carry a timezone, so browsers never read them as local time.
    assert task["created_at"].endswith(("Z", "+00:00"))
    assert task["updated_at"].endswith(("Z", "+00:00"))


def test_blank_optional_fields_are_stored_as_null(make_task):
    task = make_task(description="   ", assignee="")
    assert task["description"] is None
    assert task["assignee"] is None


def test_get_task_by_id(client, make_task):
    created = make_task(title="Provision EKS", assignee="Aarav Shah")

    response = client.get(f"/api/tasks/{created['id']}")

    assert response.status_code == 200
    assert response.json()["assignee"] == "Aarav Shah"


def test_get_missing_task_returns_404(client):
    response = client.get("/api/tasks/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "Task 9999 not found"


def test_update_task_changes_only_sent_fields(client, make_task):
    created = make_task(title="Add Ingress", description="Route /api to FastAPI")

    response = client.put(f"/api/tasks/{created['id']}", json={"status": "in_progress"})

    assert response.status_code == 200
    updated = response.json()
    assert updated["status"] == "in_progress"
    assert updated["title"] == "Add Ingress"
    assert updated["description"] == "Route /api to FastAPI"


def test_update_rejects_null_for_required_fields(client, make_task):
    created = make_task()
    response = client.put(f"/api/tasks/{created['id']}", json={"title": None})
    assert response.status_code == 422


def test_update_missing_task_returns_404(client):
    response = client.put("/api/tasks/9999", json={"status": "done"})
    assert response.status_code == 404


def test_delete_task(client, make_task):
    created = make_task()

    response = client.delete(f"/api/tasks/{created['id']}")

    assert response.status_code == 204
    assert client.get(f"/api/tasks/{created['id']}").status_code == 404


def test_delete_missing_task_returns_404(client):
    assert client.delete("/api/tasks/9999").status_code == 404


def test_validation_errors_return_422(client):
    assert client.post("/api/tasks", json={}).status_code == 422
    assert client.post("/api/tasks", json={"title": ""}).status_code == 422
    assert client.post("/api/tasks", json={"title": "x", "status": "blocked"}).status_code == 422
    assert client.post("/api/tasks", json={"title": "x", "priority": "urgent"}).status_code == 422
    assert client.post("/api/tasks", json={"title": "x" * 201}).status_code == 422


def test_filter_by_status_priority_and_search(client, make_task):
    make_task(title="Write Terraform", status="in_progress", priority="critical")
    make_task(title="Write Dockerfile", status="done", priority="low")
    make_task(title="Configure Grafana", status="in_progress", priority="low", assignee="Priya")

    by_status = client.get("/api/tasks", params={"status": "in_progress"}).json()
    assert {t["title"] for t in by_status} == {"Write Terraform", "Configure Grafana"}

    by_priority = client.get("/api/tasks", params={"priority": "low"}).json()
    assert {t["title"] for t in by_priority} == {"Write Dockerfile", "Configure Grafana"}

    by_search = client.get("/api/tasks", params={"search": "write"}).json()
    assert {t["title"] for t in by_search} == {"Write Terraform", "Write Dockerfile"}

    by_assignee = client.get("/api/tasks", params={"search": "priya"}).json()
    assert [t["title"] for t in by_assignee] == ["Configure Grafana"]


def test_list_rejects_unknown_status_filter(client):
    assert client.get("/api/tasks", params={"status": "blocked"}).status_code == 422


def test_stats_route_is_not_shadowed_by_task_id(client):
    # If /stats were declared after /{task_id}, FastAPI would try to parse "stats" as an int.
    response = client.get("/api/tasks/stats")
    assert response.status_code == 200
    assert response.json()["total"] == 0


def test_stats_aggregates_tasks(client, make_task):
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    tomorrow = (date.today() + timedelta(days=1)).isoformat()
    make_task(status="done", priority="high", due_date=yesterday)
    make_task(status="todo", priority="critical", due_date=yesterday)
    make_task(status="in_progress", priority="low", due_date=tomorrow)
    make_task(status="review", priority="medium")

    stats = client.get("/api/tasks/stats").json()

    assert stats["total"] == 4
    assert stats["by_status"] == {"todo": 1, "in_progress": 1, "review": 1, "done": 1}
    assert stats["by_priority"] == {"low": 1, "medium": 1, "high": 1, "critical": 1}
    assert stats["completion_rate"] == 25.0
    assert stats["overdue"] == 1  # the done task is not overdue
    assert stats["high_priority_open"] == 1
