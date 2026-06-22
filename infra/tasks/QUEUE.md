# Shared task queue

All agents read this list; each claims one task with `bash infra/claim.sh <task-id>`
(atomic single-writer lock). Statuses: `[ ]` open · `[~]` claimed · `[x]` done.

- [ ] task-1 — Создать `docs/NOTES.md`: краткий обзор проекта в 3 абзацах.
- [ ] task-2 — Сгенерировать `CHANGELOG.md` из `git log`, сгруппировать по смыслу.
- [ ] task-3 — Добавить секцию FAQ в `README.md` (4 вопроса-ответа по запуску).
- [ ] task-4 — Добавить JSDoc-комментарии к функциям в `src/lib/format.ts`.
- [ ] task-5 — Добавить Vitest для `src/lib/diff.ts`.

> Each task is independent and small on purpose — they run in parallel on separate worktrees and
> merge cleanly. After finishing, an agent flips its line to `[x]` (inside the claim lock).
