# Memory layers — flat-vector vs temporal knowledge graph

Interview requirement: *"Memory & mind-maps для агентов … Знаешь разницу между flat-vector и temporal
knowledge graph."* Our `MemoryStore` (`src/agent-harness/memory.ts`) is the seam; backends plug in.

## Flat-vector memory (our local baseline; mem0's core)
- **Model:** each memory is text → an embedding vector; recall = nearest-neighbour (cosine) + filters.
- **Strengths:** dead simple, fast, great for "find semantically similar past notes/chunks".
- **Limits:** no first-class notion of **time** or **relationships**. It can't tell that "price was X,
  now it's Y" — both chunks just sit in the index; it has no idea which is current or how entities
  relate. Contradictions accumulate; you retrieve stale facts as easily as fresh ones.
- **Use when:** semantic retrieval of documents/snippets, personalization, low-stakes recency.

## Temporal knowledge graph (Zep / Graphiti)
- **Model:** facts become **entities (nodes)** and **relations (edges)**, each edge carrying validity
  intervals — bi-temporal: when the fact was *true in the world* and when the system *learned* it.
  New facts **supersede** old ones (the old edge gets an invalid-at time, not deletion).
- **Strengths:** reasons about **how facts change over time** and **how entities relate**. Supports
  point-in-time queries ("what did we believe on date D"), supersession, and relationship traversal.
  On evolving-fact benchmarks this is the gap: Zep/Graphiti ≈ 63.8% vs flat ≈ 49% (LongMemEval).
- **Limits:** heavier infra (a graph DB), extraction/ingestion cost, more moving parts.
- **Use when:** long-lived agents whose world changes (prices, statuses, ownership, business state) —
  exactly BOS.PRO's "agents running a business over time".

## Why it matters for a business-operating agent
A flat store would let the agent "remember" a stale price forever. A temporal KG knows the *current*
price, *why* it changed, and *when* — and can answer "as of last month". For autonomous, long-running
agents that's the difference between confidently-wrong and correct.

## The 2026 landscape reality (important)
- **Zep Community Edition is deprecated** (moved to `legacy/`). Self-host "Zep" is no longer the path.
- Today's real options for the temporal-KG layer:
  1. **Zep Cloud** — managed, credit-based, TS SDK `@getzep/zep-cloud` (`graph.add`, `graph.search`).
     Graphiti runs under the hood. Fastest to a working temporal KG; needs an API key (key stays
     server-side, never in the browser).
  2. **Graphiti (self-host, open source)** — the actual temporal-KG engine. Runs against Neo4j /
     FalkorDB / Kuzu + an LLM/embedder. Fully self-hosted, but it's a Python library, so you wrap it in
     a small service that our TS adapter calls.
- **mem0** sits between: hybrid vector + graph + key-value; easiest in pure TS, but its default recall
  is flat-vector semantics, not a bi-temporal graph.

## Our integration shape (backend-mediated)
`MemoryStore` stays the interface. A `ZepMemoryStore` / `GraphitiMemoryStore` adapter calls a small
**backend `/memory` route** (Node/Deno) that holds the key and talks to Zep Cloud or Graphiti. The
browser never sees the key. The local flat store remains the offline default and the flat-vector
baseline we compare against.

## Sources
- Zep CE deprecated / Graphiti self-host — https://vectorize.io/articles/zep-alternatives
- mem0 vs Zep (Graphiti) — https://vectorize.io/articles/mem0-vs-zep
- Zep — adding data to the graph — https://help.getzep.com/v2/adding-data-to-the-graph
- Zep — search graph — https://help.getzep.com/sdk-reference/graph/search
- Graphiti — https://github.com/getzep/graphiti
