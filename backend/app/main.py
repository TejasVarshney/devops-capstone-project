"""FastAPI application entrypoint: `uvicorn app.main:app`."""

import logging
from typing import Annotated

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.routers import tasks

logging.basicConfig(
    level=settings.log_level,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger("taskboard")

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="REST API for TaskBoard, the DevOps capstone project-management app.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(tasks.router)

# Request count, latency histogram and in-flight requests for Prometheus.
Instrumentator(
    excluded_handlers=["/metrics"],
    should_instrument_requests_inprogress=True,
    inprogress_labels=True,
).instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)


@app.get("/", tags=["meta"], summary="Service information")
def root():
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "commit": settings.git_sha,
        "docs": "/docs",
    }


@app.get("/health", tags=["probes"], summary="Liveness probe")
def health():
    """Cheap check: the process is up and can answer HTTP. It does not touch the database."""
    return {"status": "ok"}


@app.get("/ready", tags=["probes"], summary="Readiness probe")
def ready(db: Annotated[Session, Depends(get_db)]):
    """Can this instance serve traffic right now? That requires a working database connection."""
    try:
        db.execute(text("SELECT 1"))
    except Exception as exc:  # any failure means "do not send me traffic"
        logger.warning("Readiness check failed: %s", exc)
        return JSONResponse(
            status_code=503, content={"status": "NOT READY", "database": "unreachable"}
        )
    return {"status": "READY", "database": "ok"}
