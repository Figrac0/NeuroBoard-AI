# Enable Zep + Graphiti memory (temporal knowledge graph)

The local flat-vector store is the default and always works offline. This enables the **temporal
knowledge graph** backend (Zep Cloud, Graphiti under the hood). Key stays server-side; the browser
adapter (`src/agent-harness/memory-zep.ts`) calls our backend `/memory` route.

## Steps
1. Create a Zep Cloud account and get an API key: https://www.getzep.com/
2. Install the SDK in the server (kept out of the zero-dep default; lazy-imported):
   ```bash
   cd server && npm i @getzep/zep-cloud
   ```
3. Start the backend with the key (PowerShell):
   ```powershell
   $env:ZEP_API_KEY = "<your-key>"; npm run server:start
   ```
   (bash: `ZEP_API_KEY=<your-key> npm run server:start`)
4. Point the client at the Zep backend — create `.env`:
   ```env
   VITE_MEMORY_BACKEND=zep
   ```
5. Restart `npm run dev` (or `npm run dev:client`) and hard-reload the browser.

## Verify
- Run the agent on a listing, then on another of the same category. The **Память** block + the
  `Память` evidence phase should show recalled facts coming back from Zep.
- In the Zep dashboard you'll see the `avito-listings` graph filling with episodes/edges over time.
- Backend sanity check:
  ```bash
  curl -s -X POST http://localhost:8080/memory/recall -H "Content-Type: application/json" -d '{"category":"electronics","limit":5}'
  ```
  Returns `{ "records": [...] }` (empty list until data is added; 501 on `/memory/remember` means the
  key/SDK isn't configured).

## Notes
- `graph.add` / `graph.search` SDK shapes follow Zep docs; **verify against your account** before the
  interview (the SDK moves fast). Server code: `server/src/zep-memory.mjs`.
- Fully self-hosted alternative (no cloud): run **Graphiti** + Neo4j/FalkorDB and wrap it in a small
  service exposing the same `/memory` contract. See `docs/MEMORY-LAYERS.md`.
