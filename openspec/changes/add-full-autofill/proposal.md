# Change: Full listing autofill

## Why
The agent only edited description and price. Sellers leave category, attributes (brand/model/year/…)
and titles incomplete — exactly the fields that hurt listing quality. To make the agent autonomous over
a *whole* listing, it must fill every seller-editable field, not wait for manual input.

## What changes
Add three capabilities to the `agent-runner` capability and the default tool registry:
- `suggest-category` — fix a wrong category (e.g. a car listed as electronics).
- `fill-attributes` — infer category params from title/description, validate select options, fill only
  empty keys.
- `improve-title` — produce a concise, informative title.

The planner gains rules + an extended LLM action list to select these steps, ordered facts → texts →
price. Token budget is raised to cover up to 5 steps. Each new step has its own verifier and per-step
snapshot (rollback covers a wrong category/attribute).

## Impact
- Capability: `agent-runner` (delta in `specs/agent-runner/spec.md`).
- Code: `tools.ts`, `planner.ts`, `runner.ts`, `services/llm.ts`.
- No breaking changes to existing description/price flows or the public model client.
