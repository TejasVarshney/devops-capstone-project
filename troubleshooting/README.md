# Troubleshooting lab

Each manifest is deliberately broken. Apply it, find the problem using only `kubectl`,
fix it, then compare with `solutions/`.

The manifests carry no namespace, so they land in your current namespace (`default` unless
you changed it). Every command below works against that same namespace.

## The investigation loop

```
kubectl get            ->  what state is it in?
kubectl describe       ->  why? (read the Events section at the bottom)
kubectl get events     ->  what happened, in order?
kubectl logs           ->  what did the application say?
fix -> kubectl apply   ->  verify
```

---

## Lab 1 - Broken image

```bash
kubectl apply -f troubleshooting/broken-image.yaml
kubectl get pods
kubectl describe pod <pod-name>
kubectl get events --sort-by=.lastTimestamp
```

Expected investigation:

```
ImagePullBackOff
      ↓
describe Pod  ->  Failed to pull image ... not found
      ↓
wrong image/tag
      ↓
fix the Deployment
```

Fix it in place, or apply the solution:

```bash
kubectl set image deployment/broken-image web=nginxinc/nginx-unprivileged:1.30-alpine
# or
kubectl apply -f troubleshooting/solutions/broken-image-fixed.yaml
kubectl rollout status deployment/broken-image
```

Other things that cause `ImagePullBackOff`: a private registry without `imagePullSecrets`,
a GHCR package that is still private, or an image built for the wrong CPU architecture.

---

## Lab 2 - Broken Service

```bash
kubectl apply -f troubleshooting/broken-service.yaml
kubectl get pods            # Running and Ready
kubectl get svc
kubectl get endpoints web-svc
kubectl get pods --show-labels
kubectl describe svc web-svc   # compare "Selector" with the Pod labels
```

Test from inside the cluster:

```bash
kubectl run curl --rm -it --restart=Never --image=curlimages/curl -- curl -m 3 http://web-svc
```

The key lesson: **a Service selects Pods using labels.**
No matching labels = no endpoints = no traffic.

```bash
kubectl apply -f troubleshooting/solutions/broken-service-fixed.yaml
kubectl get endpoints web-svc   # now lists two Pod IPs
```

---

## Lab 3 (bonus) - Failing readiness probe

```bash
kubectl apply -f troubleshooting/broken-probe.yaml
kubectl get pods                    # STATUS Running, READY 0/1
kubectl describe pod <pod-name>     # Readiness probe failed: HTTP probe failed with statuscode: 404
kubectl get endpoints probe-demo    # empty
```

Running is not the same as Ready. Kubernetes only sends Service traffic to Ready Pods.
This is exactly why TaskBoard has separate `/health` (liveness) and `/ready` (readiness)
endpoints.

```bash
kubectl apply -f troubleshooting/solutions/broken-probe-fixed.yaml
```

---

## Lab 4 (bonus) - CrashLoopBackOff

```bash
kubectl apply -f troubleshooting/crashloop.yaml
kubectl get pods -w                 # RESTARTS keeps climbing
kubectl logs deploy/api-config-demo
kubectl logs <pod-name> --previous  # output of the last crashed container
```

```bash
kubectl apply -f troubleshooting/solutions/crashloop-fixed.yaml
```

---

## Clean up

```bash
kubectl delete -f troubleshooting/ --ignore-not-found
kubectl delete -f troubleshooting/solutions/ --ignore-not-found
```

## Bonus: break TaskBoard itself

```bash
# Point the backend at an image tag that does not exist
kubectl set image deployment/taskboard-backend backend=ghcr.io/<you>/taskboard-backend:does-not-exist -n taskboard
kubectl get pods -n taskboard
# Undo with Helm
helm rollback taskboard -n taskboard
```

Because the backend uses `maxUnavailable: 0`, the old Pods keep serving while the new
ones fail to pull, so users never notice. That is a rolling update protecting production.
