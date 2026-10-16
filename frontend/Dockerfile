# TaskBoard frontend: multi-stage build
#   stage 1 (Node)  -> npm ci + vite build -> static files in dist/
#   stage 2 (Nginx) -> serves dist/ and proxies /api to the backend
# Node, npm and node_modules never reach the runtime image.

FROM node:24-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
ARG GIT_SHA=dev
ARG APP_ENV=docker
ENV VITE_GIT_SHA=${GIT_SHA} \
    VITE_APP_ENV=${APP_ENV}
RUN npm run build


# Unprivileged Nginx: runs as a non-root user and listens on 8080.
FROM nginxinc/nginx-unprivileged:1.30-alpine

# The official image renders /etc/nginx/templates/*.template with envsubst at startup,
# so the same image works in Docker Compose (backend) and Kubernetes (<release>-backend).
ENV BACKEND_HOST=backend \
    BACKEND_PORT=8000

COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
