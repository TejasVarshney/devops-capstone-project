#!/usr/bin/env bash
# One-time cluster preparation for TaskBoard.
#
#   bash scripts/install-cluster-addons.sh eks     # EKS created by ./terraform
#   bash scripts/install-cluster-addons.sh local   # minikube / kind / Docker Desktop
#
# Installs: namespace (+ gp3 StorageClass on EKS), an ingress controller,
# metrics-server (local only; EKS gets it as a managed add-on) and kube-prometheus-stack.
set -euo pipefail

TARGET="${1:-eks}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "==> Namespace"
kubectl apply -f "$ROOT/k8s/namespace.yaml"

if [ "$TARGET" = "eks" ]; then
  echo "==> Default gp3 StorageClass"
  kubectl apply -f "$ROOT/k8s/storageclass-gp3.yaml"

  echo "==> Traefik ingress controller (creates an AWS load balancer)"
  helm repo add traefik https://traefik.github.io/charts >/dev/null
  helm repo update traefik >/dev/null
  helm upgrade --install traefik traefik/traefik -n traefik --create-namespace --wait
else
  echo "==> metrics-server (needed by the HPA)"
  if command -v minikube >/dev/null 2>&1 && minikube status >/dev/null 2>&1; then
    minikube addons enable metrics-server
    minikube addons enable ingress
  else
    helm repo add metrics-server https://kubernetes-sigs.github.io/metrics-server/ >/dev/null
    helm repo update metrics-server >/dev/null
    # --kubelet-insecure-tls: local clusters use self-signed kubelet certificates.
    helm upgrade --install metrics-server metrics-server/metrics-server -n kube-system \
      --set 'args={--kubelet-insecure-tls}' --wait
    echo "    Install an ingress controller for your local cluster, e.g. Traefik:"
    echo "    helm upgrade --install traefik traefik/traefik -n traefik --create-namespace"
    echo "    (then use --set ingress.className=traefik)"
  fi
fi

echo "==> kube-prometheus-stack (Prometheus + Grafana)"
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts >/dev/null
helm repo update prometheus-community >/dev/null
helm upgrade --install monitoring prometheus-community/kube-prometheus-stack \
  -n monitoring --create-namespace \
  -f "$ROOT/monitoring/kube-prometheus-stack-values.yaml" --wait --timeout 10m

echo
echo "Done. Next:"
echo "  helm upgrade --install taskboard $ROOT/helm/taskboard -n taskboard -f $ROOT/helm/taskboard/values-$( [ "$TARGET" = eks ] && echo eks || echo dev ).yaml \\"
echo "    --set backend.image.tag=<commit-sha> --set frontend.image.tag=<commit-sha>"
