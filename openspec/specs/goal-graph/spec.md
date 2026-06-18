# Goal Graph

## Purpose
Represent a goal as a DAG of nodes with dependencies and schedule them in parallel layers.
Implemented in `src/agent-harness/goal-graph.ts`; a linear plan is the path-graph special case.

## Requirements

### Requirement: Topological layering
The system SHALL compute execution layers via topological sort, grouping nodes with no unmet
dependencies into the same (parallelizable) layer.

#### Scenario: Diamond dependency
- **GIVEN** nodes A → {B, C} → D
- **WHEN** layers are built
- **THEN** the layers are [A], [B, C], [D]

### Requirement: Invalid graphs are rejected
The system SHALL throw on cycles and on references to unknown nodes before any step runs.

#### Scenario: Cycle present
- **GIVEN** A depends on B and B depends on A
- **WHEN** layers are built
- **THEN** an error is thrown and the run finishes with status `failed`

### Requirement: Bounded parallel execution
The runner SHALL execute nodes in a layer concurrently up to `policy.maxParallel`, capturing a state
snapshot per node before execution.

#### Scenario: Independent steps run in parallel
- **GIVEN** a layer with two independent nodes and `maxParallel` ≥ 2
- **WHEN** the layer executes
- **THEN** both nodes run concurrently and each has its own rollback snapshot
