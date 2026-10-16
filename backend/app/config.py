"""Runtime settings, read from environment variables (12-factor style)."""

import os
from dataclasses import dataclass, field

DEFAULT_DATABASE_URL = "postgresql+psycopg://taskboard:taskboard@localhost:5432/taskboard"


def _split_csv(value: str) -> list[str]:
    return [item.strip() for item in value.split(",") if item.strip()]


@dataclass(frozen=True)
class Settings:
    app_name: str = "TaskBoard API"
    app_version: str = field(default_factory=lambda: os.getenv("APP_VERSION", "1.0.0"))
    git_sha: str = field(default_factory=lambda: os.getenv("GIT_SHA", "dev"))
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", DEFAULT_DATABASE_URL))
    cors_origins: list[str] = field(
        default_factory=lambda: _split_csv(
            os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
        )
    )
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO").upper())


settings = Settings()
