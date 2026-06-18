import { describe, expect, it } from 'vitest'

import { createMemoryStore, summarizeMemories } from './memory'

describe('memory store', () => {
  it('remembers and recalls by category', async () => {
    const store = createMemoryStore({ persist: false })
    await store.remember({ category: 'electronics', content: 'price ~70000', tags: ['price'], data: { price: 70000 } })
    await store.remember({ category: 'auto', content: 'price ~950000', tags: ['price'], data: { price: 950000 } })

    const electronics = await store.recall({ category: 'electronics' })
    expect(electronics).toHaveLength(1)
    expect(electronics[0].content).toContain('70000')
  })

  it('respects limit and returns newest first', async () => {
    const store = createMemoryStore({ persist: false })
    for (let i = 0; i < 5; i += 1) {
      await store.remember({ category: 'c', content: `r${i}`, tags: [], data: {} })
    }

    const recalled = await store.recall({ category: 'c', limit: 2 })
    expect(recalled).toHaveLength(2)
    expect(recalled[0].content).toBe('r4')
  })

  it('clears all records', async () => {
    const store = createMemoryStore({ persist: false })
    await store.remember({ category: 'c', content: 'x', tags: [], data: {} })
    await store.clear()
    expect(await store.all()).toHaveLength(0)
  })

  it('summarizeMemories returns empty string when there is nothing', () => {
    expect(summarizeMemories([])).toBe('')
  })
})
