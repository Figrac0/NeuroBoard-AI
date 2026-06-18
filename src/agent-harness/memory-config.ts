// Выбор backend памяти по env: 'local' (flat-vector baseline, всегда работает офлайн)
// или 'zep' (temporal knowledge graph через backend-роут). Интерфейс MemoryStore один.

import { env } from '@/lib/env'

import { createMemoryStore, type MemoryStore } from './memory'
import { createZepMemoryStore } from './memory-zep'

export function createConfiguredMemoryStore(): MemoryStore {
  if (env.memoryBackend === 'zep') {
    return createZepMemoryStore()
  }

  return createMemoryStore({ persist: true, namespace: 'listings' })
}
