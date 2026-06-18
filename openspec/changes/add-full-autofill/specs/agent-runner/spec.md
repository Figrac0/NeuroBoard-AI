# Agent Runner — delta

Delta against `openspec/specs/agent-runner/spec.md`. Markers: ADDED / MODIFIED / REMOVED.

## ADDED Requirement: Category correction
The agent SHALL be able to reclassify a listing into the correct category when the current one is wrong.

#### Scenario: Car listed as electronics
- **GIVEN** a "Volkswagen Polo" listing with category `electronics`
- **WHEN** the `suggest-category` tool runs
- **THEN** it patches category to `auto`, and a per-step snapshot allows one-click rollback

## ADDED Requirement: Attribute completion
The agent SHALL infer and fill missing category attributes from the title and description without
overwriting values the seller already provided.

#### Scenario: Laptop attributes inferred
- **GIVEN** an electronics listing titled "MacBook Air M2 13"" with empty params
- **WHEN** `fill-attributes` runs
- **THEN** it fills type/brand/model (validated against allowed select values) and leaves filled keys intact

## ADDED Requirement: Title improvement
The agent SHALL produce a concise, informative title (≤ 80 chars) from the listing facts.

#### Scenario: Generic title improved
- **GIVEN** an empty or too-generic title
- **WHEN** `improve-title` runs and passes verification
- **THEN** the title field is patched

## MODIFIED Requirement: Controlled step execution
The run-wide token budget default is raised to 60000 to accommodate plans of up to five steps
(category, attributes, title, description, price).
