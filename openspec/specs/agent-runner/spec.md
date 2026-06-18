# Agent Runner

## Purpose
Execute a goal toward a result under control — not one prompt/one answer. Implemented in
`src/agent-harness/runner.ts` (+ `tools.ts`, `planner.ts`, `model-client.ts`).

## Requirements

### Requirement: Controlled step execution
The runner SHALL execute each step with a per-step timeout, a bounded number of hard-failure retries,
and a run-wide token budget, recording every action to the evidence log.

#### Scenario: Model call exceeds the timeout
- **GIVEN** a step whose model call exceeds `policy.timeoutMs`
- **WHEN** the composed AbortSignal fires
- **THEN** the attempt is aborted and retried up to `policy.maxRetries`, then the step fails

#### Scenario: Token budget is exhausted
- **GIVEN** cumulative usage ≥ `policy.tokenBudget`
- **WHEN** a step requests another model call
- **THEN** the runner stops the run with status `budget-exceeded`

### Requirement: Verify → refine → escalate feedback loop
After a tool produces a result, the runner SHALL verify it before applying the patch; on failure it
SHALL refine with verifier feedback up to `policy.maxRefines`, then escalate.

#### Scenario: Result fails verification, then passes after refine
- **GIVEN** a tool result that fails its verifier
- **WHEN** refine budget remains
- **THEN** the tool re-runs with the feedback injected and, if it passes, the patch is applied

#### Scenario: Escalation when refines are exhausted
- **GIVEN** verification still fails after refines
- **WHEN** an escalation client is configured
- **THEN** the step retries once on the stronger model; otherwise it is flagged `needs-human`

### Requirement: Pluggable model transport
The runner SHALL call models through a `ModelClient` interface so the provider is swappable, with a
resilient primary→fallback wrapper (`src/agent-harness/model-client.ts`, `config.ts`).

#### Scenario: Primary provider is unavailable
- **GIVEN** the configured primary (OmniRoute) errors and the request is not user-aborted
- **WHEN** a fallback client (Ollama) exists
- **THEN** the call transparently retries on the fallback

### Requirement: Listing tools cover all seller fields
The default tool registry SHALL cover category, attributes, title, description and price, each with a
verifier (`src/agent-harness/tools.ts`).

#### Scenario: Missing attributes are inferred
- **GIVEN** a listing with empty category params
- **WHEN** the `fill-attributes` tool runs
- **THEN** it infers values from title/description, validates select options, and patches only empty keys
