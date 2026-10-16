"""Run the real Alembic migrations, so a broken migration fails CI before it reaches a cluster."""

from pathlib import Path

from sqlalchemy import create_engine, inspect, text

from alembic import command
from alembic.config import Config

BACKEND_DIR = Path(__file__).resolve().parents[1]


def _alembic_config(database_url: str) -> Config:
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))
    config.set_main_option("sqlalchemy.url", database_url)
    return config


def test_migrations_upgrade_and_downgrade(tmp_path):
    database_url = f"sqlite+pysqlite:///{tmp_path / 'migrations.db'}"
    config = _alembic_config(database_url)
    engine = create_engine(database_url)

    command.upgrade(config, "head")
    try:
        assert "tasks" in inspect(engine).get_table_names()
        with engine.connect() as connection:
            seeded = connection.execute(text("SELECT COUNT(*) FROM tasks")).scalar_one()
        assert seeded == 10

        command.downgrade(config, "base")
        assert "tasks" not in inspect(engine).get_table_names()
    finally:
        engine.dispose()
