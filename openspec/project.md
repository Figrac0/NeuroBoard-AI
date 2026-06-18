# Project — Avito AI Assistant / Agentic Harness

## Context
Brownfield React + TypeScript app (seller dashboard for Avito-style listings) extended with an
**agentic harness** in `src/agent-harness/`. The harness turns a goal into a plan, executes it under
control (retries, timeout, token budget), verifies each step, refines on feedback, escalates when
stuck, and snapshots state for rollback. Model transport is pluggable (OmniRoute/Claude Sonnet by
default, Ollama fallback). Evals measure model × policy configurations.

## Why OpenSpec here
This is a **brownfield** codebase, so OpenSpec is the right fit: we express *deltas* against existing
behavior (ADDED / MODIFIED / REMOVED) instead of restating whole specs. See `WHY-OPENSPEC.md`.

## Spec-Driven workflow (3-phase)
1. **Propose** — a change lives in `openspec/changes/<id>/` with `proposal.md`, `design.md`,
   `tasks.md`, and delta specs under `specs/<capability>/spec.md`.
2. **Apply** — implement against the tasks checklist; keep code traceable to requirements.
3. **Archive** — merge deltas into `openspec/specs/<capability>/spec.md` (the source of truth).

## Conventions
- Stack: TypeScript (strict, no `any`, no `enum` due to `erasableSyntaxOnly`), React 19, Vite, Vitest.
- Requirements use SHALL; each has at least one `Scenario` (GIVEN / WHEN / THEN).
- Specs are traceable: every requirement names the source file(s) under `src/agent-harness/`.
- Quality gates: `npm run lint`, `npm test`, `npm run build` must pass before archive.

## Capabilities (source of truth in `openspec/specs/`)
- `agent-runner` — execution loop, verify, refine, escalate, budgets, tools.
- `goal-graph` — DAG planning and parallel layer scheduling.
- `evals` — golden tasks, scorer, model/config comparison matrix.
- `memory` — recall-before-plan / write-after-run; pluggable store (local, Zep+Graphiti).
