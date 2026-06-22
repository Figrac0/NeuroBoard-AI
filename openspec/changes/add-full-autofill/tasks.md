# Tasks — Full listing autofill

## 1. Prompts & parsers (`src/services/llm.ts`)

- [x] `buildTitlePrompt` + `extractTitle`
- [x] `buildAttributesPrompt` (schema from `getFieldConfig`) + `parseAttributes` (strict validation)
- [x] `buildCategoryPrompt` + `parseCategory` (valid enum only)

## 2. Capabilities (`src/agent-harness/planner.ts`)

- [x] `CAPABILITY_KINDS` source list + derived `CapabilityKind`
- [x] `CAPABILITY_TITLES` + `isCapabilityKind` for all 5
- [x] Rule-based planner: add `fill-attributes` / `improve-title` rules, order facts → texts → price
- [x] LLM planner prompt lists all 5 actions

## 3. Tools (`src/agent-harness/tools.ts`)

- [x] `fillAttributesTool` (+ verifier), `improveTitleTool` (+ verifier), `suggestCategoryTool`
- [x] Register all 5 in `createDefaultRegistry`

## 4. Runner (`src/agent-harness/runner.ts`)

- [x] Raise `DEFAULT_POLICY.tokenBudget` to 60000

## 5. Tests & gates

- [x] `planner.test.ts` (rules pick the right steps)
- [x] `npm test` (28 passed), `npm run lint`, `npm run build` all green

## 6. Archive

- [ ] Merge `specs/agent-runner/spec.md` delta into `openspec/specs/agent-runner/spec.md`

openspec/
├─ project.md ← контекст проекта + правила для OpenSpec
├─ WHY-OPENSPEC.md ← OpenSpec (brownfield) vs Spec Kit (greenfield)
├─ specs/ ← ИСТОЧНИК ИСТИНЫ (текущее поведение)
│ ├─ agent-runner/spec.md ← возможность «runner»: loop, verify, escalate, budgets
│ ├─ goal-graph/spec.md ← возможность «goal-graph»: DAG, слои
│ ├─ evals/spec.md ← возможность «evals»: задачи, скорер, матрица
│ └─ memory/spec.md ← возможность «memory»: recall/write, flat vs temporal
└─ changes/
└─ add-full-autofill/ ← одно изменение (как папка)
├─ proposal.md ← зачем и что меняем
├─ design.md ← как технически (решения, альтернативы)
├─ tasks.md ← чек-лист реализации (ты открыл его)
└─ specs/agent-runner/spec.md ← ДЕЛЬТА к спеке (маркеры ADDED/MODIFIED)
