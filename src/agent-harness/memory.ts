// Memory-слой агента: что узнали в прошлых прогонах, чтобы планировать и действовать
// лучше. MemoryStore — интерфейс; локальный адаптер (localStorage / in-memory) всегда
// работает офлайн. В прод за тем же интерфейсом встают mem0 / Zep+Graphiti / gbrain.

import type { Language } from '@/types/items'

export interface MemoryRecord {
  readonly id: string
  readonly at: number
  readonly category: string
  readonly content: string // человекочитаемый вывод/урок
  readonly tags: readonly string[]
  readonly data: Readonly<Record<string, string | number>>
}

export interface MemoryQuery {
  readonly category?: string
  readonly tags?: readonly string[]
  readonly limit?: number
}

export interface MemoryStore {
  remember(record: Omit<MemoryRecord, 'id' | 'at'>): Promise<MemoryRecord>
  recall(query: MemoryQuery): Promise<MemoryRecord[]>
  all(): Promise<MemoryRecord[]>
  clear(): Promise<void>
}

const DEFAULT_LIMIT = 5
const MAX_RECORDS = 200

function loadFromStorage(key: string): MemoryRecord[] {
  if (typeof localStorage === 'undefined') {
    return []
  }

  try {
    const raw = localStorage.getItem(key)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as MemoryRecord[]) : []
  } catch {
    return []
  }
}

function saveToStorage(key: string, records: readonly MemoryRecord[]): void {
  if (typeof localStorage === 'undefined') {
    return
  }

  try {
    localStorage.setItem(key, JSON.stringify(records))
  } catch {
    // переполнение квоты игнорируем — память не критична для прогона
  }
}

export function createMemoryStore(options?: { persist?: boolean; namespace?: string }): MemoryStore {
  const persist = options?.persist ?? true
  const key = `harness-memory:${options?.namespace ?? 'default'}`
  let records: MemoryRecord[] = persist ? loadFromStorage(key) : []

  const flush = () => {
    if (persist) {
      saveToStorage(key, records)
    }
  }

  return {
    async remember(record) {
      const full: MemoryRecord = { ...record, id: crypto.randomUUID(), at: Date.now() }
      records = [full, ...records].slice(0, MAX_RECORDS)
      flush()
      return full
    },
    async recall(query) {
      const limit = query.limit ?? DEFAULT_LIMIT
      const tags = query.tags ?? []

      return records
        .filter((record) => (query.category ? record.category === query.category : true))
        .filter((record) => (tags.length ? tags.some((tag) => record.tags.includes(tag)) : true))
        .slice(0, limit)
    },
    async all() {
      return [...records]
    },
    async clear() {
      records = []
      flush()
    },
  }
}

export function summarizeMemories(
  records: readonly MemoryRecord[],
  language: Language = 'ru',
): string {
  if (records.length === 0) {
    return ''
  }

  const isRu = language === 'ru'
  const lines = records.map((record) => `- ${record.content}`).join('\n')

  return isRu
    ? `Опыт прошлых прогонов (${records.length}):\n${lines}`
    : `Lessons from past runs (${records.length}):\n${lines}`
}
