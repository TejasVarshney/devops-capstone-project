# TaskBoard: DevOps Final Capstone (Session 21)

TaskBoard is a small but realistic SaaS-style project management application. The point
is not to learn isolated tools. The point is to follow one real application from a
developer laptop all the way to a monitored Kubernetes environment on AWS.

```
Developer
   │
   ▼
Git / GitHub
   │
   ▼
GitHub Actions
   ├── pytest
   ├── frontend build
   ├── Docker build
   ├── Trivy scan
   └── push images to GHCR
              │
              ▼
         Terraform
              │
        AWS VPC + EKS
              │
              ▼
            Helm
              │
      ┌───────┴────────┐
      │                │
   Frontend         Backend
   React            FastAPI
      │                │
      └──────►  PostgreSQL
              │
         Prometheus
              │
           Grafana
```

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, hand-written responsive CSS, served by unprivileged Nginx |
| Backend | FastAPI, SQLAlchemy 2, Alembic migrations, Pydantic v2 |
| Database | PostgreSQL 16 |
| Tests | Pytest (API, validation, probes, metrics, and the real migrations) |
| Containers | Docker (non-root images), Docker Compose |
| CI/CD | GitHub Actions → Trivy → GitHub Container Registry → Helm |
| Infrastructure | Terraform: AWS VPC + EKS (managed node group, EBS CSI, metrics-server) |
| Kubernetes | Helm chart: Deployments, StatefulSet + PVC, Services, Ingress, HPA, probes |
| Observability | Prometheus metrics, ServiceMonitor, PrometheusRule alerts, Grafana dashboard |

---

## Repository structure

```
session21-devops-capstone-final/
├── frontend/                 # React application and CSS
│   ├── src/                  # components, API client, styles
│   ├── nginx/                # Nginx config template (/api proxy)
│   └── Dockerfile            # multi-stage: Node build -> Nginx runtime
├── backend/                  # FastAPI application
│   ├── app/                  # API, models, schemas, DB config
│   ├── tests/                # Pytest tests
│   ├── alembic/              # DB migrations
│   └── Dockerfile
├── docker-compose.yml        # Full local stack
├── terraform/                # AWS VPC + EKS infrastructure
├── helm/taskboard/           # Kubernetes package (chart, values, Grafana dashboard)
├── k8s/                      # namespace / bootstrap manifests
├── monitoring/               # Prometheus/Grafana values and guide
├── troubleshooting/          # deliberately broken manifests + solutions
├── scripts/                  # load-test, smoke-test and cluster bootstrap helpers
└── .github/workflows/        # CI/CD
```

---

# PART A: Understand the application

## 3. Frontend

The frontend is intentionally closer to a real SaaS dashboard than a tutorial CRUD page:

- dark sidebar with workspace navigation
- dashboard header with search
- KPI cards (total, in flight, completion %, overdue)
- task table with inline status changes, edit and delete
- status filters, priority filter and sorting
- priority badges and assignee avatars
- activity feed
- delivery-pipeline indicator showing the commit SHA the image was built from
- create/edit task modal
- responsive layout: the table turns into cards on phones, and the sidebar becomes a drawer
- loading skeletons, a backend-error state, and a "connection lost" banner

The browser only ever calls relative URLs: `/api/tasks` and `/api/tasks/stats`.
It never needs the internal backend hostname. Vite (development), Nginx (Docker) and
the Kubernetes Ingress handle that routing.

## 4. Backend

FastAPI exposes:

```
GET    /                    service name, version, commit
GET    /health              liveness
GET    /ready               readiness (checks the database)
GET    /metrics             Prometheus metrics

GET    /api/tasks           list (filters: ?status= &priority= &search= &limit= &offset=)
GET    /api/tasks/{id}
POST   /api/tasks
PUT    /api/tasks/{id}      partial update: only the fields you send change
DELETE /api/tasks/{id}
GET    /api/tasks/stats     counts by status/priority, completion rate, overdue
```

Swagger documentation is at `/docs` when the backend is running.

A task looks like this:

```jsonc
{
  "id": 7,
  "title": "Tune the HPA CPU target",
  "description": "Run the load generator and watch the replica count.",
  "status": "todo",            // todo | in_progress | review | done
  "priority": "medium",        // low | medium | high | critical
  "assignee": "Sara Khan",
  "due_date": "2026-10-22",
  "created_at": "2026-10-14T09:12:44Z",
  "updated_at": "2026-10-14T09:12:44Z"
}
```

**Why `/health`?** A container can be alive while its application is unhealthy.
`/health` is a cheap liveness check: if it stops answering, Kubernetes restarts the container.
It deliberately does **not** touch the database. Otherwise a database outage would make
Kubernetes restart every healthy API Pod.

**Why `/ready`?** Readiness answers a different question: *can this instance serve traffic
right now?* It runs `SELECT 1` against PostgreSQL and returns `READY`, or HTTP 503
`NOT READY`. Kubernetes removes unready Pods from the Service until they recover.

**Why `/metrics`?** Prometheus needs machine-readable metrics. The FastAPI Prometheus
instrumentator exposes request counts, latency histograms and in-flight requests.
The app adds business metrics too: `taskboard_tasks_created_total`,
`taskboard_tasks_completed_total` and `taskboard_tasks_deleted_total`.

**Migrations.** The container runs `alembic upgrade head` before it starts Uvicorn. When
several replicas start at once, a PostgreSQL advisory lock makes sure only one runs the
migrations while the others wait. Migration `0002` seeds ten demo tasks so the dashboard
is not empty on first launch.

---

# PART B: Run it locally

## 5. Fastest method: Docker Compose

Requirements: Docker Desktop or Docker Engine with Docker Compose.

```bash
docker compose up --build
```

| URL | What |
|---|---|
| http://localhost:3000 | TaskBoard UI |
| http://localhost:8000/docs | FastAPI Swagger |
| http://localhost:8000/health | liveness |
| http://localhost:8000/ready | readiness |
| http://localhost:8000/metrics | Prometheus metrics |

Check everything at once:

```bash
bash scripts/smoke-test.sh
```

Stop the stack:

```bash
docker compose down
```

Stop it and delete the database volume too:

```bash
docker compose down -v
```

## 6. Run the backend directly

Requirements: Python 3.12+ and a PostgreSQL instance. The quickest way to get one is
`docker compose up db`.

```bash
cd backend
python -m venv .venv
source .venv/bin/activate          # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

Set the database connection:

```bash
export DATABASE_URL='postgresql+psycopg://taskboard:taskboard@localhost:5432/taskboard'
# Windows PowerShell: $env:DATABASE_URL = 'postgresql+psycopg://taskboard:taskboard@localhost:5432/taskboard'
```

Run the migrations:

```bash
alembic upgrade head
```

Start FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

Test it:

```bash
curl http://localhost:8000/health
curl http://localhost:8000/api/tasks
```

Then open http://localhost:8000/docs.

### Frontend dev server (hot reload)

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173, and /api is proxied to localhost:8000
```

### Configuration

| Variable | Used by | Default |
|---|---|---|
| `DATABASE_URL` | backend | `postgresql+psycopg://taskboard:taskboard@localhost:5432/taskboard` |
| `CORS_ORIGINS` | backend | `http://localhost:5173,http://localhost:3000` |
| `LOG_LEVEL` | backend | `INFO` |
| `GIT_SHA` | backend image (build arg) | `dev` |
| `BACKEND_HOST` / `BACKEND_PORT` | frontend Nginx | `backend` / `8000` |
| `GIT_SHA`, `APP_ENV` | frontend image (build args) | `dev`, `docker` |
| `API_PROXY_TARGET` | Vite dev server | `http://localhost:8000` |

---

# PART C: Testing

## 7. Pytest

```bash
cd backend
pip install -r requirements-dev.txt
pytest -q
```

The suite runs against in-memory SQLite, so it needs no database server. It covers:

- CRUD on every endpoint, including 404s and 422 validation errors
- filtering and search, and the statistics calculation
- `/stats` not being shadowed by `/{id}` (a classic routing bug)
- `/health`, `/ready` (including a simulated database outage → 503) and `/metrics`
- running the real Alembic migrations up and down

Tests run **before** any image is built or pushed:

```
Bad code
  ↓
pytest fails
  ↓
Pipeline stops
  ↓
No broken image is promoted
```

This is the first quality gate.

---

# PART D: Git and GitHub

## 8. Initialize Git

```bash
git init
git add .
git commit -m "initial TaskBoard application"
git branch -M main
git remote add origin <YOUR_GITHUB_REPO>
git push -u origin main
```

- **Git**: version control
- **GitHub**: remote collaboration and source platform
- **commit**: an immutable project checkpoint
- **branch**: an isolated line of development
- **pull request**: a controlled change review. Here the CI pipeline runs on every PR,
  but images are only pushed and deployed from `main`.

---

# PART E: Docker

## 9. Backend Dockerfile

The backend image:

1. starts from `python:3.12-slim` and applies Debian security updates
2. installs dependencies (a separate layer, cached until `requirements.txt` changes)
3. copies Alembic
4. copies the application code
5. creates and switches to a non-root user (UID 10001)
6. exposes port 8000
7. runs the migrations
8. starts Uvicorn (`exec`, so Uvicorn is PID 1 and receives SIGTERM)

```bash
docker build -t taskboard-backend:local ./backend
```

Run it against a reachable PostgreSQL:

```bash
docker run --rm -p 8000:8000 \
  -e DATABASE_URL='postgresql+psycopg://taskboard:taskboard@host.docker.internal:5432/taskboard' \
  taskboard-backend:local
```

## 10. Frontend Dockerfile

The frontend uses a multi-stage build:

```
Node 24
  ↓
npm ci && npm run build
  ↓
static dist/
  ↓
nginx-unprivileged runtime image (non-root, port 8080)
```

This keeps Node, npm and `node_modules` out of the final runtime image. At startup,
Nginx renders `nginx/default.conf.template` with `BACKEND_HOST`/`BACKEND_PORT`, so the
same image proxies `/api` to `backend` in Compose and to `taskboard-backend` in Kubernetes.

```bash
docker build -t taskboard-frontend:local ./frontend
docker images | grep taskboard
```

---

# PART F: CI/CD

## 11. GitHub Actions pipeline

The workflow is `.github/workflows/ci-cd.yml`:

```
TEST
 ↓
BUILD + SECURITY SCAN + PUSH
 ↓
DEPLOY
```

**Test job:** checkout → set up Python 3.12 → install requirements → **pytest** →
set up Node 24 → **build the React frontend**.

**Build/scan/push job:** build the backend image → build the frontend image →
**Trivy scan** both → log in to GHCR → **push** to `ghcr.io/<owner>/taskboard-{backend,frontend}`.
Pull requests build and scan, but never push. Only the commit-SHA tag is pushed; there
is no `latest` tag.

**Deploy job** (pushes to `main` only): configure AWS credentials →
`aws eks update-kubeconfig` → install Helm → `helm upgrade --install ... --wait`.

The image tag is the Git commit SHA:

```
commit A → image A
commit B → image B
commit C → image C
```

That gives traceability from production back to source code. The SHA is also baked
into both images: see `GET /` on the backend and the pipeline card in the UI.

### What you need to configure on GitHub

| Setting | Why |
|---|---|
| Nothing for test/build/push | `GITHUB_TOKEN` already has `packages: write` in this workflow |
| Repo secrets `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | deploy job. Until they exist, deploy is skipped and the pipeline stays green |
| Add the CI IAM principal to `cluster_admin_arns` in Terraform | otherwise `kubectl` is denied inside the cluster |
| GHCR package visibility → **Public** (or an `imagePullSecret`) | so the cluster can pull the images |

> Production tip: replace long-lived AWS keys with GitHub OIDC
> (`role-to-assume` in `aws-actions/configure-aws-credentials`).

`.github/dependabot.yml` also keeps pip, npm, Docker base images and GitHub Actions
up to date through pull requests.

---

# PART G: Security scanning

## 12. Trivy

The pipeline scans both container images for **HIGH** and **CRITICAL** vulnerabilities
that already have a fix (`ignore-unfixed: true`), and fails the build if it finds any.
Run the same scan locally:

```bash
docker run --rm -v /var/run/docker.sock:/var/run/docker.sock aquasec/trivy:0.69.3 \
  image --severity HIGH,CRITICAL --ignore-unfixed taskboard-backend:local
```

(Pin an explicit Trivy version, never `latest`, and check the
[Trivy releases](https://github.com/aquasecurity/trivy/releases) for the current one.)

The Trivy action is pinned to a **full commit SHA**, not a tag. In March 2026 attackers
re-pointed most of `aquasecurity/trivy-action`'s version tags at credential-stealing code
(CVE-2026-33634). Pinning by SHA means a moved tag cannot change what your pipeline runs.
That is a supply-chain lesson in its own right.

A security scanner is not a guarantee of security. It is one automated control.
These are different layers:

| Layer | Example | In this project |
|---|---|---|
| SAST | static analysis of your code (CodeQL, Semgrep) | (extension exercise) |
| Dependency scanning | known-vulnerable libraries | Dependabot, Trivy library scan |
| Secret scanning | leaked keys in Git | GitHub secret scanning |
| Container scanning | OS and package CVEs in images | **Trivy** |
| Runtime security | behavior of running workloads | non-root, dropped capabilities, read-only root FS, Pod Security labels |

---

# PART H: Terraform

## 13. Why Terraform?

Kubernetes only manages workloads. It does not create the AWS network or the EKS cluster.
Terraform creates:

```
AWS
 ├── VPC (2 availability zones)
 ├── public subnets       (load balancers, NAT)
 ├── private subnets      (worker nodes)
 ├── NAT gateway
 └── EKS cluster
       ├── add-ons: CoreDNS, kube-proxy, VPC CNI, Pod Identity, EBS CSI, metrics-server
       └── managed worker nodes (t3.medium × 2, scales to 4)
```

> **Cost warning:** EKS, the NAT gateway and the EC2 nodes are billed per hour.
> Run `terraform destroy` as soon as you finish.

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars   # optional: adjust
terraform init
terraform plan
terraform apply
```

The default region is `ap-south-1` (Mumbai). When it finishes, configure kubectl with
the command Terraform prints:

```bash
terraform output -raw configure_kubectl
aws eks update-kubeconfig --region ap-south-1 --name taskboard-eks
kubectl get nodes
```

Destroy everything when you are done. Uninstall the Helm releases first, so AWS load
balancers created by Kubernetes do not block the VPC deletion:

```bash
helm uninstall taskboard -n taskboard
helm uninstall traefik -n traefik
terraform destroy
```

### Important teaching point

Terraform is Infrastructure as Code. Instead of clicking through
`AWS Console → VPC → Subnet → EKS → Nodes...`, we describe the infrastructure in code,
review it in a pull request, and let Terraform reconcile the real world to that desired state.

---

# PART I: Kubernetes

## 14. Namespace and cluster bootstrap

```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/storageclass-gp3.yaml    # EKS only: makes encrypted gp3 the default
```

A namespace provides logical isolation for the application. Or run the whole bootstrap
(namespace, StorageClass, ingress controller, monitoring) in one go:

```bash
bash scripts/install-cluster-addons.sh eks      # or: local
```

## 15. Helm

Instead of maintaining many hand-edited YAML files, Helm packages the deployment.
Point it at **your** images:

```bash
helm upgrade --install taskboard ./helm/taskboard \
  --namespace taskboard \
  --create-namespace \
  --set backend.image.repository=ghcr.io/<you>/taskboard-backend \
  --set frontend.image.repository=ghcr.io/<you>/taskboard-frontend \
  --set backend.image.tag=<commit-sha> \
  --set frontend.image.tag=<commit-sha>

helm test taskboard -n taskboard     # runs the chart's smoke-test Pod
```

The image tag is **required**, and there is no `latest` default. Every release must name
the exact commit it runs, which is also what makes `helm rollback` meaningful.

On a local cluster without a registry, build the images tagged with the current commit
and load them into the cluster:

```bash
TAG=$(git rev-parse --short HEAD)
docker build -t taskboard-backend:$TAG ./backend
docker build -t taskboard-frontend:$TAG ./frontend
minikube image load taskboard-backend:$TAG
minikube image load taskboard-frontend:$TAG
helm upgrade --install taskboard ./helm/taskboard -n taskboard --create-namespace \
  -f helm/taskboard/values-dev.yaml \
  --set backend.image.repository=taskboard-backend,backend.image.tag=$TAG \
  --set frontend.image.repository=taskboard-frontend,frontend.image.tag=$TAG
```

Key Helm concepts:

| Concept | In this repo |
|---|---|
| Chart | `helm/taskboard/` |
| Values | `values.yaml` (defaults), `values-dev.yaml`, `values-eks.yaml` |
| Templates | `helm/taskboard/templates/*.yaml` |
| Release | `taskboard` in namespace `taskboard` |
| Upgrade | `helm upgrade --install ...` (what CI runs on each commit) |
| Rollback | `helm history taskboard -n taskboard`, then `helm rollback taskboard <rev> -n taskboard` |

---

# PART J: Kubernetes components

## 16. Deployment

A Deployment manages the backend and frontend Pods. If a Pod dies, the Deployment
creates a replacement. Rolling updates use `maxUnavailable: 0`, so capacity never drops
during a release.

```bash
kubectl delete pod -l app.kubernetes.io/component=backend -n taskboard --wait=false
kubectl get pods -n taskboard -w      # watch the replacements appear
```

## 17. Service

Pods are ephemeral and their IPs change. A Service provides one stable name and IP:

```
Frontend → taskboard-backend Service → backend Pods (selected by labels)
```

## 18. PostgreSQL

For the classroom demo, PostgreSQL runs inside the cluster as a **StatefulSet** whose
`volumeClaimTemplate` creates a **PersistentVolumeClaim** (an EBS gp3 volume on EKS).
Delete the Pod and the data survives.

For production, weigh running PostgreSQL in Kubernetes against a managed database such
as **Amazon RDS**: backups, failover, patching and storage growth all become AWS's job.
The chart supports both. For RDS, set:

```bash
--set postgres.enabled=false \
--set externalDatabase.url='postgresql+psycopg://user:pass@<rds-endpoint>:5432/taskboard'
```

---

# PART K: Ingress

## 19. Ingress

The application has one hostname and several routes:

```
taskboard.local/          →  React frontend
taskboard.local/api       →  FastAPI backend
taskboard.local/docs      →  FastAPI Swagger UI
```

**Local cluster** (minikube shown):

```bash
minikube addons enable ingress
# same command as in Part I (values-dev.yaml turns the Ingress on)
helm upgrade --install taskboard ./helm/taskboard -n taskboard -f helm/taskboard/values-dev.yaml \
  --set backend.image.repository=taskboard-backend,backend.image.tag=$TAG \
  --set frontend.image.repository=taskboard-frontend,frontend.image.tag=$TAG
echo "$(minikube ip) taskboard.local" | sudo tee -a /etc/hosts
```

Then open http://taskboard.local.

**EKS:** `values-eks.yaml` uses the Traefik ingress controller, which Kubernetes exposes
through an AWS load balancer. It sets no hostname, so the load balancer's DNS name works directly:

```bash
kubectl get ingress -n taskboard     # open the ADDRESS in a browser
```

An Ingress resource is only configuration. An **Ingress Controller** (Traefik, NGINX, the
AWS Load Balancer Controller, and so on) must be running to actually implement it. Without
one, the Ingress has no ADDRESS and nothing happens.

---

# PART L: HPA

## 20. Horizontal Pod Autoscaler

The HPA scales the backend on CPU utilization (target 60% of the 100m request,
between 2 and 6 Pods by default):

```
low traffic   →  2 Pods
high CPU      →  3 Pods → 4 Pods → ...
traffic gone  →  back to 2 (after a 2-minute stabilization window)
```

```bash
kubectl get hpa -n taskboard
```

The HPA needs two things: **resource requests** on the container (the chart sets them),
and a **metrics provider** such as metrics-server (Terraform installs it as an EKS add-on).
If `TARGETS` shows `<unknown>`, metrics-server is missing.

A normal health request does not create enough CPU pressure. Generate controlled load:

```bash
kubectl apply -f scripts/load-generator.yaml     # in-cluster, 4 parallel workers
kubectl get hpa -n taskboard -w
kubectl top pods -n taskboard
kubectl delete -f scripts/load-generator.yaml    # stop, then watch it scale back down
```

Or from your laptop: `python scripts/load-test.py --url http://<ingress>/api/tasks -c 40 -d 180`.

---

# PART M: Monitoring

## 21. Prometheus

Prometheus collects metrics from the FastAPI `/metrics` endpoint. The chart's
**ServiceMonitor** tells the Prometheus Operator what to scrape, and its
**PrometheusRule** defines alerts (backend down, 5xx rate above 5%, p95 latency above 500 ms).

## 22. Grafana

Grafana visualizes the metrics. The chart ships a ready-made dashboard,
*TaskBoard - API overview*, which answers:

- How many HTTP requests are arriving?
- Which endpoint is slow?
- Are errors increasing?
- Is the application receiving traffic?
- Is CPU increasing?
- Is the HPA scaling?

Installation and port-forward commands are in **[monitoring/README.md](monitoring/README.md)**.

---

# PART N: Troubleshooting lab

Full instructions are in **[troubleshooting/README.md](troubleshooting/README.md)**, and
the solutions are in `troubleshooting/solutions/`.

## 23. Broken image

```bash
kubectl apply -f troubleshooting/broken-image.yaml
kubectl get pods
kubectl describe pod <pod-name>
kubectl get events --sort-by=.lastTimestamp
```

```
ImagePullBackOff → describe Pod → wrong image/tag → fix the Deployment
```

## 24. Broken Service

```bash
kubectl apply -f troubleshooting/broken-service.yaml
kubectl get svc
kubectl get endpoints
kubectl get pods --show-labels
```

A Service selects Pods using labels. No matching labels = no endpoints = no traffic.

Bonus labs: a failing readiness probe (`broken-probe.yaml`) and a CrashLoopBackOff
caused by missing configuration (`crashloop.yaml`).

---

# PART O: Final demo

| # | Show | How |
|---|---|---|
| 1 | Application | open TaskBoard, create a task |
| 2 | API | `/docs`: create, read, update and delete a task |
| 3 | Database | `kubectl exec -it taskboard-postgres-0 -n taskboard -- psql -U taskboard -c 'select id, title, status from tasks;'` |
| 4 | Git | make a small change and commit it |
| 5 | CI | push, then show the pytest step running in GitHub Actions |
| 6 | Docker | show the two images (`docker images`, or the build steps) |
| 7 | Security | show the Trivy scan output in the pipeline |
| 8 | Registry | show both packages in GHCR, tagged with the commit SHA |
| 9 | Terraform | walk through `terraform/main.tf`, then `terraform output` |
| 10 | Kubernetes | `kubectl get pods -n taskboard` and `kubectl get svc -n taskboard` |
| 11 | Helm | `helm list -n taskboard` and `helm history taskboard -n taskboard` |
| 12 | Ingress | open the app through the Ingress hostname |
| 13 | HPA | `kubectl get hpa -n taskboard -w` while the load generator runs |
| 14 | Monitoring | Prometheus targets and the Grafana dashboard |
| 15 | Failure simulation | break a Service or image and troubleshoot it live |

---

# Final student project

Pick a domain: CRM, inventory management, appointment booking, helpdesk, ecommerce
administration, clinic management, restaurant management, employee management, or a
learning management system.

**Minimum requirements**

- **Application:** a frontend, a backend, PostgreSQL, at least 4 REST APIs, and a responsive UI
- **Engineering:** Git/GitHub, automated tests, Docker
- **DevOps:** GitHub Actions, a security scan, a container registry, Terraform, Kubernetes,
  Helm, Ingress, HPA, Prometheus/Grafana

**Final presentation:** every student demonstrates the whole path:

```
Application → Git commit → CI pipeline → Docker image → Security scan → Registry
→ Terraform infrastructure → Kubernetes deployment → Helm → Ingress → Autoscaling
→ Monitoring → Troubleshooting
```

That is the actual objective of Session 21.
