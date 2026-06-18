# Demo script — "offer in 1 meeting"

10–12 minutes. Each beat maps to a stated requirement. Pre-start: OmniRoute (:20128) up, `npm run dev`
up, Ubuntu/tmux ready in a second terminal.

## 0. Thesis (30s)
"Open models + a strong harness beat frontier-naive — and I can measure it. Here's my pipeline: how the
agent coped, what I changed, how I verified." Open the repo.

## 1. Spec-Driven (1.5 min) — *Spec-Driven Dev requirement*
- Show `openspec/`: `specs/` (source of truth) vs `changes/add-full-autofill/` (proposal + design +
  tasks + **delta** with `ADDED`/`MODIFIED`). 3-phase loop: Propose → Apply → Archive.
- One line of `WHY-OPENSPEC.md`: OpenSpec wins on **brownfield** (deltas, low ceremony); Spec Kit on
  **greenfield** (full spec per feature, forces up-front contracts). "This is how I stay un-lost in plans."

## 2. The harness pipeline live (3 min) — *goal-graph, feedback loop, escalation, rollback*
- Open a listing → **AI-агент · plan mode** → **Построить план**. Point out the **goal-graph** (nodes →
  layers) and that the plan was built by the model.
- **Запустить агента**. Narrate the evidence phases: `План → Снимок → Модель → Проверка → (Рефайн) →
  Память → Шаг`. Highlight: verify gates the patch; refine feeds verifier feedback back; budgets/timeout.
- Show **snapshots → Откатить сюда** (escalation/rollback). "It drives to a result, not one prompt/one
  answer."

## 3. Full autofill (1 min) — *autonomy over the whole entity*
- On a listing with gaps: the plan includes `fill-attributes` / `improve-title` / `suggest-category`.
  The agent fills category, attributes, title, description, price — each verified, each rollback-able.

## 4. Evals + comparison (2 min) — *evals + "why open+harness beats frontier"*
- Open `/lab` (**Harness Lab**). Run `Sonnet+harness` vs `Sonnet naive` (and `Ollama qwen3+harness`).
- Read the table: same model, **+score / same success with fewer escalations** when the harness is on.
  "This is the harness contribution, isolated. Loop shape + verify + isolation = low-variance evals."

## 5. Memory — temporal KG (1.5 min) — *memory layer + flat-vector vs temporal-KG*
- Run the agent on a second listing of the same category → **Память** block recalls prior facts; evidence
  shows the `Память` phase. "Local store is the flat-vector baseline; Zep+Graphiti is the **temporal
  knowledge graph** — bi-temporal edges, supersession, point-in-time. That's why a long-running business
  agent doesn't act on a stale price." (`docs/MEMORY-LAYERS.md`)

## 6. Parallel orchestration + persistence (2 min) — *5+ agents, worktrees, locks, reboot*
- Second terminal (Ubuntu/tmux): `bash infra/spawn-agents.sh 5` → 5 agents, each in its own **git
  worktree** (isolation), reading the **shared `QUEUE.md`**, claiming via `claim.sh` (**single-writer
  mkdir lock**).
- Detach (`prefix d`) and reattach to show runs survive; mention `tmux-resurrect`+`continuum`
  (`@continuum-restore on`) → survives reboot/SSH timeout. (Claude Squad = one-command version.)

## 7. Harness comparison (1 min) — *used 2+ of OpenHands/OpenCode/OMA*
- `docs/HARNESS-COMPARISON.md`: OpenHands (sandboxed CodeAct) vs OpenCode (lean ReAct, shell-hook tools)
  vs ours (explicit goal-graph + verify/refine/escalate). "Why it matters for evals: an explicit loop +
  `run+verify` tools + worktree isolation = attributable, reproducible scores."

## Quality bar (mention)
TS strict (no `any`, no `enum`), 28 tests green, lint clean, prod build green — `npm test && npm run lint
&& npm run build`.
