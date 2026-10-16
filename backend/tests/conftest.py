"""Shared fixtures. Tests run against in-memory SQLite, so no PostgreSQL is needed in CI."""

import os

# Must be set before the app is imported; never let tests touch a real database.
os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def _fresh_database():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture
def make_task(client):
    def _make(**overrides):
        payload = {"title": "Write the Helm chart", "priority": "high", **overrides}
        response = client.post("/api/tasks", json=payload)
        assert response.status_code == 201, response.text
        return response.json()

    return _make
