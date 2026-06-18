# Evals

## Purpose
Measure harness efficiency: run golden tasks under multiple model × policy configs and compare.
Implemented in `src/agent-harness/evals/` and surfaced at the `/lab` route.

## Requirements

### Requirement: Deterministic scoring
The scorer SHALL produce a reproducible 0..1 score from the post-run listing (description adequacy +
price plausibility vs the task's price band), with no LLM-judge variance (`evals/score.ts`).

#### Scenario: Empty listing scores low
- **GIVEN** a listing with empty description and non-positive price
- **WHEN** it is scored
- **THEN** the total score is below 0.2

### Requirement: Config × task matrix
The matrix runner SHALL execute every (task, config) cell, recording status, score, tokens, duration,
refines and escalations, and aggregate per-config avgScore / successRate / avgTokens (`evals/matrix.ts`).

#### Scenario: Stronger model ranks higher
- **GIVEN** a strong-model config and a weak-model config over the same tasks
- **WHEN** the matrix runs
- **THEN** the strong config has a higher average score

### Requirement: Naive vs harness comparison
Configs SHALL be able to disable harness features (`policy.verify=false`, no retries/refines) so the
"open model + harness vs frontier naive" thesis can be measured (`evals/configs.ts`).

#### Scenario: Verify disabled
- **GIVEN** a config with `verify: false`
- **WHEN** a step produces a low-quality result
- **THEN** it is applied without gating (naive baseline for the comparison)
