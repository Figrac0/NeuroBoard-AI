import { describe, expect, it } from 'vitest'

import { scoreListing } from './score'
import { GOLDEN_TASKS } from './tasks'

const task = GOLDEN_TASKS[0] // ноутбук, priceBand 45000..95000

describe('scoreListing', () => {
  it('scores an empty listing low', () => {
    const score = scoreListing({ ...task.input, description: '', price: '0' }, task)
    expect(score.total).toBeLessThan(0.2)
  })

  it('scores a complete in-band listing high', () => {
    const score = scoreListing({ ...task.input, description: 'a'.repeat(220), price: '70000' }, task)
    expect(score.description).toBe(1)
    expect(score.price).toBe(1)
    expect(score.total).toBeGreaterThan(0.9)
  })

  it('penalizes a price outside the expected band', () => {
    const score = scoreListing(
      { ...task.input, description: 'a'.repeat(220), price: '300000' },
      task,
    )
    expect(score.price).toBeLessThan(1)
  })
})
