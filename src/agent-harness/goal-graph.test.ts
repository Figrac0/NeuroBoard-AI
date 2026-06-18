import { describe, expect, it } from 'vitest'

import { buildLayers, linearGraph, parallelGraph, type GoalGraph } from './goal-graph'
import type { Plan } from './planner'

function graph(
  nodes: { id: string; dependsOn?: string[] }[],
): GoalGraph {
  return {
    id: 'g',
    goal: 'improve-listing',
    createdAt: 0,
    source: 'rules',
    nodes: nodes.map((node) => ({
      id: node.id,
      kind: 'estimate-price',
      title: node.id,
      reason: 'r',
      dependsOn: node.dependsOn ?? [],
    })),
  }
}

const plan: Plan = {
  id: 'p',
  goal: 'improve-listing',
  createdAt: 0,
  source: 'rules',
  steps: [
    { id: 'a', kind: 'improve-description', title: 'A', reason: 'r', status: 'pending' },
    { id: 'b', kind: 'estimate-price', title: 'B', reason: 'r', status: 'pending' },
  ],
}

describe('buildLayers', () => {
  it('puts independent nodes in a single parallel layer', () => {
    const layers = buildLayers(graph([{ id: 'a' }, { id: 'b' }, { id: 'c' }]))
    expect(layers).toHaveLength(1)
    expect(layers[0].map((node) => node.id).sort()).toEqual(['a', 'b', 'c'])
  })

  it('orders a dependency chain into sequential layers', () => {
    const layers = buildLayers(
      graph([{ id: 'a' }, { id: 'b', dependsOn: ['a'] }, { id: 'c', dependsOn: ['b'] }]),
    )
    expect(layers.map((layer) => layer.map((node) => node.id))).toEqual([['a'], ['b'], ['c']])
  })

  it('groups a diamond into the correct layers', () => {
    const layers = buildLayers(
      graph([
        { id: 'a' },
        { id: 'b', dependsOn: ['a'] },
        { id: 'c', dependsOn: ['a'] },
        { id: 'd', dependsOn: ['b', 'c'] },
      ]),
    )
    expect(layers.map((layer) => layer.map((node) => node.id).sort())).toEqual([
      ['a'],
      ['b', 'c'],
      ['d'],
    ])
  })

  it('throws on a cycle', () => {
    expect(() =>
      buildLayers(graph([{ id: 'a', dependsOn: ['b'] }, { id: 'b', dependsOn: ['a'] }])),
    ).toThrow(/cycle/i)
  })

  it('throws on an unknown dependency', () => {
    expect(() => buildLayers(graph([{ id: 'a', dependsOn: ['missing'] }]))).toThrow(/unknown/i)
  })
})

describe('plan to graph', () => {
  it('linearGraph chains steps', () => {
    const result = linearGraph(plan)
    expect(result.nodes[0].dependsOn).toEqual([])
    expect(result.nodes[1].dependsOn).toEqual(['a'])
    expect(buildLayers(result)).toHaveLength(2)
  })

  it('parallelGraph keeps steps independent', () => {
    const result = parallelGraph(plan)
    expect(result.nodes.every((node) => node.dependsOn.length === 0)).toBe(true)
    expect(buildLayers(result)).toHaveLength(1)
  })
})
