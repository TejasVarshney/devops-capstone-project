# Monitoring: Prometheus + Grafana

```
FastAPI /metrics  <──scrape──  Prometheus  <──query──  Grafana
        ▲                          ▲
  ServiceMonitor            PrometheusRule (alerts)
 (from the TaskBoard Helm chart)
```

## 1. Install kube-prometheus-stack

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f monitoring/kube-prometheus-stack-values.yaml
kubectl get pods -n monitoring
```

## 2. Install (or upgrade) TaskBoard *after* monitoring

The chart only renders the `ServiceMonitor`, `PrometheusRule` and Grafana dashboard
`ConfigMap` when the Prometheus Operator CRDs exist. If TaskBoard was installed first,
run the same `helm upgrade --install ...` command again.

```bash
kubectl get servicemonitor,prometheusrule -n taskboard
```

## 3. Prometheus

```bash
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-prometheus 9090:9090
```

Open http://localhost:9090 → **Status → Targets**: `taskboard-backend` should be **UP**.

Useful queries:

| Question | PromQL |
|---|---|
| Is the app receiving traffic? | `sum(rate(http_requests_total{namespace="taskboard"}[1m]))` |
| Which endpoint is slow? | `histogram_quantile(0.95, sum by (le, handler) (rate(http_request_duration_seconds_bucket{namespace="taskboard"}[5m])))` |
| Are errors increasing? | `sum(rate(http_requests_total{namespace="taskboard", status="5xx"}[5m]))` |
| Is CPU increasing? | `sum by (pod) (rate(container_cpu_usage_seconds_total{namespace="taskboard", container="backend"}[2m]))` |
| Is the HPA scaling? | `kube_horizontalpodautoscaler_status_current_replicas{namespace="taskboard"}` |
| Business metric | `sum(increase(taskboard_tasks_created_total[1h]))` |

## 4. Grafana

```bash
kubectl port-forward -n monitoring svc/monitoring-grafana 3001:80
```

Open http://localhost:3001 (user `admin`, password from the values file) and go to
**Dashboards → TaskBoard - API overview**.

The dashboard JSON lives in `helm/taskboard/dashboards/taskboard.json`. You can also
import it by hand: **Dashboards → New → Import → Upload JSON file**.

## 5. Alerts

The chart ships three alerts: `TaskBoardBackendDown`, `TaskBoardHighErrorRate` and
`TaskBoardHighLatency`. View them under **Alerts** in Prometheus, or open Alertmanager:

```bash
kubectl port-forward -n monitoring svc/monitoring-kube-prometheus-alertmanager 9093:9093
```
