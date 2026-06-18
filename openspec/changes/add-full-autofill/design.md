# Design — Full listing autofill

## Capability model
`CapabilityKind` becomes a source list + derived union (`CAPABILITY_KINDS as const`) so adding a tool is
one edit and `ToolRegistry` stays exhaustive at compile time (no `enum` — `erasableSyntaxOnly`).

## Tools
- `fill-attributes` builds a schema-aware prompt from `getFieldConfig(category)` (keys, types, allowed
  select values), then `parseAttributes` strictly validates: unknown keys dropped, select values matched
  to allowed options, only **empty** keys patched (never clobber seller data). Verifier scores by filled
  fraction; ok ≥ 0.5, else feedback lists missing labels → refine.
- `improve-title` → concise title; verifier checks non-empty and length ≤ 80.
- `suggest-category` → `parseCategory` maps to the valid enum; patch is trivially valid, so rollback is
  the safety net for a wrong guess.

## Ordering
Plan order is facts → texts → price: `suggest-category` (LLM-only) → `fill-attributes` → `improve-title`
→ `improve-description` → `estimate-price`. Because the runner is sequential for linear plans and later
steps read post-patch state, description/price benefit from the freshly filled attributes/category.

## Budget
5 steps × ~6–7k tokens (OmniRoute system prefix) → raise `DEFAULT_POLICY.tokenBudget` 30k → 60k.

## Alternatives considered
- One mega-tool that fills everything in a single call: rejected — separate tools keep verifiers,
  evidence and rollback granular (per-field), which is the whole point of the harness.
