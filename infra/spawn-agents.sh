#!/usr/bin/env bash
# Launch N coding agents in parallel, each isolated in its own git worktree, inside a tmux session
# that survives reboots/SSH drops (with infra/tmux.conf installed). Run from the repo root in WSL/Linux.
#
#   bash infra/spawn-agents.sh 5
#
set -euo pipefail

SESSION="harness"
N="${1:-5}"
REPO_ROOT="$(git rev-parse --show-toplevel)"
WORKTREES_DIR="$REPO_ROOT/.worktrees"
AGENT_CMD="${AGENT_CMD:-claude}"                 # override: AGENT_CMD=opencode bash infra/spawn-agents.sh
# Agents inherit your shell env and, by default, use Claude Code's own login (e.g. Claude Max) — no
# gateway needed. To route through OmniRoute instead, export ANTHROPIC_BASE_URL (+ ANTHROPIC_AUTH_TOKEN
# and ANTHROPIC_MODEL) in your shell BEFORE running; the tmux panes inherit them.

mkdir -p "$WORKTREES_DIR"

if tmux has-session -t "$SESSION" 2>/dev/null; then
  echo "Session '$SESSION' already exists — attaching."
  exec tmux attach -t "$SESSION"
fi

tmux new-session -d -s "$SESSION" -n control -c "$REPO_ROOT"
tmux send-keys -t "$SESSION:control" "cat infra/tasks/QUEUE.md" C-m

for i in $(seq 1 "$N"); do
  wt="$WORKTREES_DIR/agent-$i"
  branch="agent/$i"

  # Worktree isolation: each agent gets its own branch + working directory (single writer per worktree).
  if [ ! -d "$wt" ]; then
    git worktree add -B "$branch" "$wt" >/dev/null
  fi

  tmux new-window -t "$SESSION" -n "agent-$i" -c "$wt"
  tmux send-keys -t "$SESSION:agent-$i" \
    "echo 'Agent $i — claim a task: bash $REPO_ROOT/infra/claim.sh <task-id>'; $AGENT_CMD" C-m
done

echo "Spawned $N agents in tmux session '$SESSION' (worktrees in $WORKTREES_DIR)."
tmux attach -t "$SESSION"
