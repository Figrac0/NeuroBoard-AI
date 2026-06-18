import { describe, expect, it } from 'vitest'

import { createEmptyParamValues } from '@/lib/item-config'
import type { ItemFormValues } from '@/types/items'

import { createRuleBasedPlanner, type PlanContext } from './planner'

function values(partial: Partial<ItemFormValues>): ItemFormValues {
  const { params, ...rest } = partial
  return {
    category: 'electronics',
    title: '',
    price: '',
    description: '',
    params: { ...createEmptyParamValues(), ...(params ?? {}) },
    ...rest,
  }
}

const FULL_PARAMS = { type: 'laptop', brand: 'Apple', model: 'M2', condition: 'used', color: 'gray' }

function context(partial: Partial<ItemFormValues>): PlanContext {
  return { values: values(partial), language: 'en', missingFields: [] }
}

describe('rule-based planner', () => {
  const planner = createRuleBasedPlanner()

  it('adds fill-attributes when params are missing', async () => {
    const plan = await planner.plan(
      'improve-listing',
      context({ title: 'MacBook Air M2', description: 'a'.repeat(50) }),
    )
    expect(plan.steps.map((step) => step.kind)).toContain('fill-attributes')
  })

  it('adds improve-title when the title is empty', async () => {
    const plan = await planner.plan(
      'improve-listing',
      context({ title: '', description: 'a'.repeat(50), params: FULL_PARAMS }),
    )
    expect(plan.steps.map((step) => step.kind)).toContain('improve-title')
  })

  it('always estimates price and skips already-complete fields', async () => {
    const plan = await planner.plan(
      'improve-listing',
      context({ title: 'MacBook Air M2 13"', description: 'a'.repeat(80), params: FULL_PARAMS }),
    )
    const kinds = plan.steps.map((step) => step.kind)
    expect(kinds).toContain('estimate-price')
    expect(kinds).not.toContain('fill-attributes')
    expect(kinds).not.toContain('improve-title')
  })
})
