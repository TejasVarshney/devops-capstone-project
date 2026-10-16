from sqlalchemy.exc import OperationalError

from app.database import get_db
from app.main import app


def test_root_reports_service_info(client):
    response = client.get("/")
    assert response.status_code == 200
    body = response.json()
    assert body["name"] == "TaskBoard API"
    assert {"version", "commit", "docs"} <= body.keys()


def test_health_is_ok(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_ready_checks_the_database(client):
    response = client.get("/ready")
    assert response.status_code == 200
    assert response.json()["status"] == "READY"


def test_ready_returns_503_when_database_is_down(client):
    class BrokenSession:
        def execute(self, *args, **kwargs):
            raise OperationalError("SELECT 1", {}, Exception("connection refused"))

        def close(self):
            pass

    app.dependency_overrides[get_db] = lambda: BrokenSession()

    response = client.get("/ready")

    assert response.status_code == 503
    assert response.json()["status"] == "NOT READY"


def test_metrics_are_exposed_for_prometheus(client, make_task):
    client.get("/api/tasks")
    make_task()

    response = client.get("/metrics")

    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text
    assert "taskboard_tasks_created_total" in response.text


def test_swagger_docs_are_available(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/openapi.json").json()["info"]["title"] == "TaskBoard API"
