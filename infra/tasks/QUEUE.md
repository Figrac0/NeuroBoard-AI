# Shared task queue

All agents read this list; each claims one task with `bash infra/claim.sh <task-id>`
(atomic single-writer lock). Statuses: `[ ]` open · `[~]` claimed · `[x]` done.

- [ ] task-1 — Add a zellij layout alternative and document it in `infra/README.md`.
- [ ] task-2 — Add a 4th golden eval task (real-estate, missing attributes) in `src/agent-harness/evals/tasks.ts` + test.
- [ ] task-3 — Add an `improve-images`/`suggest-tags` capability stub behind the existing tool interface.
- [ ] task-4 — Write `CHANGELOG.md` summarizing the harness build (Phase 1 → autofill).
- [ ] task-5 — Add a Vitest for `parseAttributes` (valid select normalization, unknown-key drop).

> Each task is independent and small on purpose — they run in parallel on separate worktrees and
> merge cleanly. After finishing, an agent flips its line to `[x]` (inside the claim lock).
