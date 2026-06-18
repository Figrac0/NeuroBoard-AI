# Infra — parallel agent orchestration + persistence

Covers the interview bullets: **5+ agents in parallel**, **worktree isolation**, **shared task list**,
**single-writer locks**, and **tmux surviving reboots/SSH timeouts**. Runs in **WSL2 Ubuntu** (Windows).

## Prerequisites (once)
```bash
wsl --install -d Ubuntu                      # from Windows PowerShell, then reboot
# inside Ubuntu:
sudo apt update && sudo apt install -y tmux git
npm i -g @anthropic-ai/claude-code           # or use your OpenCode/Claude Code binary
git clone <this repo> && cd <repo>
```

## Persistence (survives reboot + SSH drop)
```bash
git clone https://github.com/tmux-plugins/tpm ~/.tmux/plugins/tpm
cp infra/tmux.conf ~/.tmux.conf
tmux start-server && tmux new -d -s boot && tmux source ~/.tmux.conf
# in a tmux session press: prefix + I   (installs resurrect + continuum)
```
- **tmux-resurrect** saves the full environment; **tmux-continuum** auto-saves every few minutes and
  **auto-restores on tmux start** (`@continuum-restore on`). `@resurrect-processes` relaunches the agent
  commands themselves after a reboot. Detaching (or an SSH timeout) never kills the agents — they keep
  running in the tmux server; you re-`attach` later.

## Launch 5+ agents (worktree-isolated)
```bash
bash infra/spawn-agents.sh 5     # one tmux window per agent, each in its own git worktree
```
- **Worktree isolation:** `git worktree add -B agent/<i> .worktrees/agent-<i>` → each agent has its own
  branch + working dir, so edits never clobber each other (single writer *per worktree* by construction).
- **Shared task list:** `infra/tasks/QUEUE.md` — all agents read it; each claims one task.
- **Single-writer lock:** `infra/claim.sh <task-id>` uses an atomic `mkdir` lock so only one agent
  mutates the shared queue at a time (classic POSIX lock; no race).

## One-command alternative: Claude Squad
Claude Squad manages N agents in tmux + per-task git worktrees out of the box:
```bash
# https://github.com/smtg-ai/claude-squad
claude-squad           # 'n' to spawn an agent on a new worktree; repeat 5+ times
```
Use `spawn-agents.sh` to show you understand the mechanics; use Claude Squad for the polished demo.

## zellij alternative
`zellij --layout infra/zellij-layout.kdl` (zellij has built-in session resurrection).
