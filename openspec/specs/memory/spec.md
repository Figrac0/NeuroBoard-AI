# Memory

## Purpose
Let the agent learn across runs: recall prior outcomes before planning, write outcomes after a run.
Pluggable `MemoryStore` (`src/agent-harness/memory.ts`); backends: local (flat) and Zep+Graphiti
(temporal knowledge graph).

## Requirements

### Requirement: Recall before plan, write after run
The harness SHALL recall relevant prior records (by category) and inject them as a hint into tool
prompts, and SHALL persist a record of each run's outcome.

#### Scenario: Second run reuses experience
- **GIVEN** a prior completed run for category C is stored
- **WHEN** a new listing of category C is planned
- **THEN** the recalled hint is logged (phase `memory`) and passed to the tools as `memoryHint`

### Requirement: Pluggable backend
The store SHALL be swappable behind the `MemoryStore` interface without changing the runner; backends
include a local flat store and Zep+Graphiti (temporal KG).

#### Scenario: Backend swap
- **GIVEN** the runner depends only on `MemoryStore`
- **WHEN** the backend changes from local to Zep
- **THEN** no runner/tool code changes are required

### Requirement: Temporal knowledge graph option
A Zep+Graphiti backend SHALL store facts as a temporal knowledge graph (entities, relations,
validity over time), distinct from the flat-vector local baseline (see `MEMORY-LAYERS.md`).

#### Scenario: Fact superseded over time
- **GIVEN** a fact "price ≈ X" recorded earlier and "price ≈ Y" recorded later
- **WHEN** the agent recalls current state
- **THEN** the temporal graph reflects Y as current while retaining X's validity window
