// Goal-graph — цель как DAG узлов с зависимостями (а не плоский список шагов).
// buildLayers даёт топологические слои: узлы без невыполненных зависимостей
// попадают в один слой и исполняются параллельно. Линейный план — частный
// случай графа (цепочка), поэтому единый исполнитель в runner работает для обоих.

import type { AgentGoal, CapabilityKind, Plan, PlanSource } from './planner'

export interface GoalNode {
  readonly id: string
  readonly kind: CapabilityKind
  readonly title: string
  readonly reason: string
  readonly dependsOn: readonly string[]
}

export interface GoalGraph {
  readonly id: string
  readonly goal: AgentGoal
  readonly nodes: readonly GoalNode[]
  readonly createdAt: number
  readonly source: PlanSource
}

// Топологические слои (Kahn). Бросает на ссылки в неизвестные узлы и на циклы.
export function buildLayers(graph: GoalGraph): GoalNode[][] {
  const byId = new Map<string, GoalNode>()
  for (const node of graph.nodes) {
    byId.set(node.id, node)
  }

  const indegree = new Map<string, number>()
  const dependents = new Map<string, string[]>()

  for (const node of graph.nodes) {
    for (const dependency of node.dependsOn) {
      if (!byId.has(dependency)) {
        throw new Error(`Goal node "${node.id}" depends on unknown node "${dependency}"`)
      }
    }
    indegree.set(node.id, node.dependsOn.length)
  }

  for (const node of graph.nodes) {
    for (const dependency of node.dependsOn) {
      const list = dependents.get(dependency) ?? []
      list.push(node.id)
      dependents.set(dependency, list)
    }
  }

  const layers: GoalNode[][] = []
  let frontier = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0)
  let processed = 0

  while (frontier.length > 0) {
    layers.push(frontier)
    processed += frontier.length

    const next: GoalNode[] = []
    for (const node of frontier) {
      for (const dependentId of dependents.get(node.id) ?? []) {
        const remaining = (indegree.get(dependentId) ?? 0) - 1
        indegree.set(dependentId, remaining)
        if (remaining === 0) {
          const dependentNode = byId.get(dependentId)
          if (dependentNode) {
            next.push(dependentNode)
          }
        }
      }
    }

    frontier = next
  }

  if (processed !== graph.nodes.length) {
    throw new Error('Goal graph has a cycle')
  }

  return layers
}

// Линейная цепочка: шаг i зависит от i-1 — поведение классического плана.
export function linearGraph(plan: Plan): GoalGraph {
  const steps = plan.steps
  return {
    id: crypto.randomUUID(),
    goal: plan.goal,
    createdAt: Date.now(),
    source: plan.source,
    nodes: steps.map((step, index) => ({
      id: step.id,
      kind: step.kind,
      title: step.title,
      reason: step.reason,
      dependsOn: index === 0 ? [] : [steps[index - 1].id],
    })),
  }
}

// Граф без зависимостей: независимые шаги параллелятся в одном слое.
export function parallelGraph(plan: Plan): GoalGraph {
  return {
    id: crypto.randomUUID(),
    goal: plan.goal,
    createdAt: Date.now(),
    source: plan.source,
    nodes: plan.steps.map((step) => ({
      id: step.id,
      kind: step.kind,
      title: step.title,
      reason: step.reason,
      dependsOn: [],
    })),
  }
}
