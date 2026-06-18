# Harness comparison — OpenHands vs OpenCode vs this harness

Interview requirement: *"Использовал минимум 2 из: OpenHands, OpenCode, OMA. Можешь сравнить agent
loop, tool-API и orchestration model — и объяснить, почему это важно для evals."*

I ran **OpenCode** and **OpenHands** on the same task (improve a broken marketplace listing) and compare
them against **this harness** (`src/agent-harness/`). OMA (≈ *omo / Oh My OpenAgent*) is included as a
reference point: it is not a standalone loop but an **orchestrator over OpenCode** (multi-harness shim).

## TL;DR table

| Dimension | OpenHands | OpenCode | This harness |
|---|---|---|---|
| **Agent loop** | ReAct / CodeAct: reason → act → observe in a Docker-sandboxed runtime; event-stream driven | ReAct in a client/server TUI; reason → tool call → observe, multi-model | Explicit state machine: **goal-graph → plan → run → verify → refine → escalate → snapshot/rollback** |
| **Tool API** | Actions/observations via runtime service API; tools run in a sandboxed container | Tools = deterministic functions + shell hooks; provider-agnostic, config-driven | Typed `AgentTool` (`run` + `verify`); patches are typed deltas to form state; pluggable `ModelClient` |
| **Orchestration** | Mostly single agent (+ delegation/micro-agents); 1 sandbox per session | Single agent per session; parallelism via external tools (worktrees/tmux) or omo | Parallel DAG layers (`maxParallel`) in-process; 5+ coding agents via Claude Squad worktrees (infra layer) |
| **Sandbox/isolation** | Strong (Docker runtime per session) | Process-level; isolation via git worktrees | Browser/Node; isolation via per-step **snapshots** + worktrees for multi-agent |
| **Best at** | Autonomous repo-level coding in a sandbox | Fast terminal coding, model-agnostic | Goal-directed business actions with **measured** verify/feedback/rollback |

## Agent loop — and why the differences matter
- **OpenHands** centers on a sandboxed *action/observation* event loop (CodeAct): the model emits an
  action, the runtime executes it in a container, returns an observation, repeat. Strong isolation,
  heavier startup.
- **OpenCode** is a leaner ReAct loop in a client/server TUI: reason → tool/shell call → observe, with
  first-class multi-model support.
- **This harness** does not leave control to a free-form ReAct loop. It compiles the goal into a
  **DAG**, then each node goes through an explicit, inspectable pipeline (verify → refine → escalate)
  with budgets and snapshots. The loop is *legible*: every transition is an evidence entry.

## Tool API — and why it matters
- OpenHands tools are runtime actions executed in the sandbox (file edit, bash, browse), surfaced as
  typed observations.
- OpenCode tools are deterministic functions/shell hooks the harness converts model intent into.
- Here, a tool is a typed `AgentTool<T>` with **`run` + `verify`**. Co-locating verification with the
  tool is the key design choice: the harness can gate, score and refine *per tool*, which is exactly
  what turns "it ran" into "it produced a result that passed a check".

## Orchestration model — and why it matters
- OpenHands: one strong sandboxed agent per session; multi-agent is delegation inside that runtime.
- OpenCode: one agent per session; you get 5+ by running many sessions over **git worktrees** (single
  writer per worktree) under tmux, or via **omo/OMA** orchestrating several OpenCode/Claude Code agents.
- Here: two layers — (1) in-process **parallel DAG layers** for steps of one goal; (2) the infra layer
  (Claude Squad + worktrees + tmux) for 5+ independent agents with worktree isolation and a shared task
  list. See `infra/`.

## Why all of this matters **for evals** (the core ask)
Evals are only meaningful if the thing you measure is **controlled and reproducible**:
1. **Loop shape determines variance.** A free ReAct loop has high run-to-run variance → noisy evals.
   An explicit pipeline (verify/refine/escalate) with fixed budgets makes scores *attributable* to the
   change you made, not to loop luck. That's why the same model can show large eval swings purely from
   harness/scenario changes.
2. **Tool API determines what you can score.** `run + verify` exposes a per-step quality signal, so
   evals can credit/penalize individual capabilities, not just the final answer.
3. **Orchestration determines throughput and isolation.** Worktree isolation + single-writer locks let
   you run many eval cells in parallel without cross-contamination — fast, trustworthy matrices.
This is why our Eval Lab (`/lab`) compares *model × policy* on identical golden tasks and can isolate
"verify on vs off" — measuring the harness contribution, not just the model.

## How to reproduce (live evidence)
- **OpenCode** (already installed): run it on this repo, ask it to improve a listing's description; note
  loop steps and tool calls.
- **OpenHands** (Docker): `docker run -it --rm --pull=always -e SANDBOX_RUNTIME_CONTAINER_IMAGE=docker.all-hands.dev/all-hands-ai/runtime:latest -v /var/run/docker.sock:/var/run/docker.sock -p 3000:3000 docker.all-hands.dev/all-hands-ai/openhands:latest` → open http://localhost:3000, point the LLM at OmniRoute (OpenAI-compatible base URL). Run the same task.
- **This harness**: `/lab` eval matrix + the agent panel run.
> Verify the exact loop/tool wording above against your live runs before the interview — versions move fast.

## Sources
- best-of Agent Harnesses (ranked list) — https://github.com/RyanAlberts/best-of-Agent-Harnesses
- OpenHands — https://github.com/All-Hands-AI/OpenHands
- OpenCode orchestration — https://dev.to/joaomelo-tech/deep-dive-into-opencode-agent-orchestration-3ocd
- omo / Oh My OpenAgent (OMA) — https://github.com/code-yeongyu/oh-my-openagent
- Terminal coding agents (scaffolding/harness/context) — https://arxiv.org/pdf/2603.05344
