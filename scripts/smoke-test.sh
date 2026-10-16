#!/usr/bin/env bash
# End-to-end smoke test against a running TaskBoard.
#
#   bash scripts/smoke-test.sh                          # Docker Compose defaults
#   bash scripts/smoke-test.sh http://taskboard.local http://taskboard.local
#
# Arg 1: frontend base URL (default http://localhost:3000)
# Arg 2: backend base URL  (default http://localhost:8000)
set -euo pipefail

FRONTEND="${1:-http://localhost:3000}"
BACKEND="${2:-http://localhost:8000}"
pass=0
fail=0

check() {
  local name="$1" expected="$2" url="$3"
  shift 3
  local code
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$@" "$url" || echo "000")
  if [ "$code" = "$expected" ]; then
    printf '  \033[32mPASS\033[0m  %-32s %s\n' "$name" "$code"
    pass=$((pass + 1))
  else
    printf '  \033[31mFAIL\033[0m  %-32s got %s, expected %s  (%s)\n' "$name" "$code" "$expected" "$url"
    fail=$((fail + 1))
  fi
}

echo "Frontend: $FRONTEND"
echo "Backend:  $BACKEND"
echo

check "frontend index"              200 "$FRONTEND/"
check "frontend -> /api/tasks"      200 "$FRONTEND/api/tasks"
check "backend /health"             200 "$BACKEND/health"
check "backend /ready"              200 "$BACKEND/ready"
check "backend /metrics"            200 "$BACKEND/metrics"
check "GET /api/tasks/stats"        200 "$BACKEND/api/tasks/stats"
check "POST invalid task -> 422"    422 "$BACKEND/api/tasks" -X POST -H 'Content-Type: application/json' -d '{"title":""}'

# Full CRUD round trip
created=$(curl -s --max-time 10 -X POST "$BACKEND/api/tasks" -H 'Content-Type: application/json' \
  -d '{"title":"Smoke test task","priority":"low"}')
id=$(printf '%s' "$created" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')
if [ -n "$id" ]; then
  check "GET created task"          200 "$BACKEND/api/tasks/$id"
  check "PUT created task"          200 "$BACKEND/api/tasks/$id" -X PUT -H 'Content-Type: application/json' -d '{"status":"done"}'
  check "DELETE created task"       204 "$BACKEND/api/tasks/$id" -X DELETE
  check "GET deleted task -> 404"   404 "$BACKEND/api/tasks/$id"
else
  printf '  \033[31mFAIL\033[0m  create task: %s\n' "$created"
  fail=$((fail + 1))
fi

echo
echo "$pass passed, $fail failed"
[ "$fail" -eq 0 ]
