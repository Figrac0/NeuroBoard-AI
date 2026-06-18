# Why OpenSpec here (and OpenSpec vs Spec Kit)

Talking points for the interview requirement: *"Объясняешь, почему OpenSpec выигрывает на brownfield,
а Spec Kit — на greenfield."*

## The core structural difference
- **Spec Kit** keeps a **full spec file per feature** and runs a long, rigid workflow
  (constitution → specify → clarify → plan → analyze → tasks → implement). Every spec restates the
  feature in full. Great when there's nothing yet to anchor to.
- **OpenSpec** keeps a **source of truth** in `openspec/specs/` and expresses each change as a
  **delta** in `openspec/changes/<id>/` using `ADDED` / `MODIFIED` / `REMOVED` markers, on a short
  3-phase loop (Propose → Apply → Archive).

## Why OpenSpec wins on brownfield
On an existing codebase you are almost never building a capability from zero — you're *modifying* one.
- You don't re-derive the whole "agent-runner" spec to add a `fill-attributes` tool; you write a delta:
  `ADDED Requirement: Attribute completion`. That's how real maintenance work actually looks.
- Deltas are atomic and auditable: the change folder is a reviewable unit; archiving merges it into the
  source of truth. History stays clean.
- Low ceremony → fast iteration, which matters when an AI agent drives the edits. (Reported real-world
  task: ~12 min OpenSpec vs ~90 min Spec Kit for the same change.)

## Why Spec Kit wins on greenfield
On a 0→1 project the volume of *new* decisions is huge and there is no source of truth yet. Spec Kit's
rigid, full-spec-per-feature workflow **forces** the AI to commit schemas, API contracts and component
hierarchies up front, and its cross-feature files make systems-level interaction analysis easier when
everything is being invented at once. The overhead is proportional there; on brownfield it isn't.

## How this maps to BOS.PRO's harness work
BOS agents mostly operate on **existing** business apps (brownfield): add a tool, change a retry policy,
extend memory. Delta-based specs + a tight Propose→Apply→Archive loop are exactly what an autonomous
agent needs to "не теряться в планах" — each change is a small, reviewable, archivable unit.

## Sources
- OpenSpec — https://github.com/Fission-AI/OpenSpec
- OpenSpec concepts — https://github.com/Fission-AI/OpenSpec/blob/main/docs/concepts.md
- Spec Kit vs OpenSpec — https://intent-driven.dev/knowledge/spec-kit-vs-openspec/
- Brownfield comparison — https://medium.com/@mathivananmani/reviving-brownfield-projects-with-ai-a-comparative-look-at-github-spec-kit-openspec-and-bmad-a7bc5116dd9a
