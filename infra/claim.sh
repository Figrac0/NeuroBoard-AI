#!/usr/bin/env bash
# Single-writer claim on the shared task queue. `mkdir` is atomic on POSIX, so exactly one agent can
# hold the lock at a time — no race when multiple agents mutate QUEUE.md.
#
#   bash infra/claim.sh task-3
#
set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
QUEUE="$REPO_ROOT/infra/tasks/QUEUE.md"
LOCK="$REPO_ROOT/infra/tasks/.queue.lock"
TASK_ID="${1:?usage: claim.sh <task-id>}"
WHO="$(hostname)/$$"

# Spin briefly for the lock (atomic mkdir).
for _ in $(seq 1 50); do
  if mkdir "$LOCK" 2>/dev/null; then
    trap 'rmdir "$LOCK"' EXIT
    if grep -q "\[ \] $TASK_ID" "$QUEUE"; then
      # Single writer inside the lock: mark the task as claimed.
      sed -i "s|\[ \] $TASK_ID|[~] $TASK_ID (claimed by $WHO)|" "$QUEUE"
      echo "Claimed $TASK_ID as $WHO"
      exit 0
    fi
    echo "Task $TASK_ID not available (already claimed or unknown)." >&2
    exit 1
  fi
  sleep 0.2
done

echo "Could not acquire queue lock (held by another agent)." >&2
exit 1
