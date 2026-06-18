// Zep+Graphiti backend for MemoryStore (temporal knowledge graph).
// The browser never holds the API key: this adapter calls our backend `/memory` route,
// which talks to Zep Cloud server-side. Falls back to empty results if Zep is not configured,
// so the app never breaks. See docs/SETUP-ZEP.md.

import { apiRequest } from '@/services/api'

import type { MemoryQuery, MemoryRecord, MemoryStore } from './memory'

export function createZepMemoryStore(): MemoryStore {
  const recall = async (query: MemoryQuery): Promise<MemoryRecord[]> => {
    try {
      const response = await apiRequest<{ records: MemoryRecord[] }>('/memory/recall', {
        method: 'POST',
        json: query,
      })
      return response?.records ?? []
    } catch {
      return []
    }
  }

  return {
    async remember(record) {
      const full: MemoryRecord = { ...record, id: crypto.randomUUID(), at: Date.now() }
      try {
        await apiRequest('/memory/remember', { method: 'POST', json: full })
      } catch {
        // Zep не настроен/недоступен — память не критична для прогона.
      }
      return full
    },
    recall,
    async all() {
      return recall({ limit: 50 })
    },
    async clear() {
      try {
        await apiRequest('/memory/clear', { method: 'POST', json: {} })
      } catch {
        // no-op
      }
    },
  }
}
