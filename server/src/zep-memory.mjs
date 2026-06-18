// Backend-сторона memory-слоя на Zep Cloud (Graphiti — temporal knowledge graph под капотом).
// Ключ держится здесь, на сервере. SDK подгружается лениво: сервер стартует и без него,
// а роут /memory просто деградирует (recall -> [], remember -> 501), пока Zep не настроен.
//
// Включение: cd server && npm i @getzep/zep-cloud, затем ZEP_API_KEY=... в окружении сервера.

const GRAPH_ID = process.env.ZEP_GRAPH_ID || 'avito-listings'

let clientPromise = null

async function getClient() {
  const apiKey = process.env.ZEP_API_KEY
  if (!apiKey) {
    return null
  }

  if (!clientPromise) {
    clientPromise = import('@getzep/zep-cloud')
      .then((module) => {
        const ZepClient = module.ZepClient ?? module.default?.ZepClient
        return ZepClient ? new ZepClient({ apiKey }) : null
      })
      .catch(() => null)
  }

  return clientPromise
}

async function ensureGraph(client) {
  try {
    await client.graph.create({ graphId: GRAPH_ID })
  } catch {
    // граф уже существует — это нормально
  }
}

export async function rememberZep(record) {
  const client = await getClient()
  if (!client) {
    return null
  }

  await ensureGraph(client)
  await client.graph.add({
    graphId: GRAPH_ID,
    type: 'json',
    data: JSON.stringify(record),
  })

  return record
}

export async function recallZep(query) {
  const client = await getClient()
  if (!client) {
    return []
  }

  const searchQuery =
    [query?.category, ...(query?.tags ?? [])].filter(Boolean).join(' ') || 'listing'

  const result = await client.graph.search({
    graphId: GRAPH_ID,
    query: searchQuery,
    scope: 'edges',
    limit: query?.limit ?? 5,
  })

  const edges = result?.edges ?? []
  return edges.map((edge, index) => ({
    id: edge.uuid ?? `zep-${index}`,
    at: Date.parse(edge.createdAt ?? '') || Date.now(),
    category: query?.category ?? '',
    content: edge.fact ?? JSON.stringify(edge),
    tags: ['zep'],
    data: {},
  }))
}
