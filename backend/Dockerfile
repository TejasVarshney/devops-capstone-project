# TaskBoard backend: FastAPI + SQLAlchemy + Alembic
FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Pick up Debian security fixes published after the base image was built.
RUN apt-get update \
    && apt-get upgrade -y --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# 1. Dependencies first, so this layer is cached until requirements.txt changes.
#    pip is removed afterwards: the app never needs it at runtime, and its vendored
#    libraries (urllib3, msgpack) carry HIGH CVEs that fail the Trivy gate.
COPY requirements.txt .
RUN pip install -r requirements.txt && python -m pip uninstall -y pip

# 2. Migrations, then application code.
COPY alembic.ini .
COPY alembic ./alembic
COPY app ./app

# 3. Never run the application as root.
RUN useradd --uid 10001 --no-create-home --shell /usr/sbin/nologin appuser
USER 10001

ARG GIT_SHA=dev
ENV GIT_SHA=${GIT_SHA}

EXPOSE 8000

HEALTHCHECK --interval=15s --timeout=3s --start-period=20s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health', timeout=2)"

# 4. Apply migrations (serialized across replicas by an advisory lock), then serve.
#    exec makes uvicorn PID 1 so it receives SIGTERM from Docker/Kubernetes directly.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --proxy-headers --forwarded-allow-ips='*'"]
