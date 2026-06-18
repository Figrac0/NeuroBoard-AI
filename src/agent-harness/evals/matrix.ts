// Матрица evals: прогоняем каждую golden-задачу под каждым конфигом
// (модель × политика harness) и собираем метрики. Это и есть «как я замерил»
// и «сравнение моделей/конфигов»: avgScore, successRate, токены, ретраи, эскалации.

import { getRevisionProbe, sanitizeFormValues } from '@/lib/forms'
import { getMissingFieldLabels } from '@/lib/revision'
import type { ItemFormValues, Language } from '@/types/items'

import { createEvidenceLog, type EvidenceEntry, type EvidencePhase } from '../evidence'
import { parallelGraph } from '../goal-graph'
import { type ModelClient } from '../model-client'
import { createRuleBasedPlanner } from '../planner'
import { runGraph, type RunnerPolicy, type RunStatus } from '../runner'
import { createSnapshotStore } from '../snapshot'
import { createDefaultRegistry } from '../tools'

import { scoreListing } from './score'
import type { EvalTask } from './tasks'

export interface EvalConfig {
  readonly id: string
  readonly label: string
  readonly client: ModelClient
  readonly policy: RunnerPolicy
}

export interface EvalCell {
  readonly taskId: string
  readonly configId: string
  readonly status: RunStatus
  readonly score: number
  readonly tokens: number
  readonly durationMs: number
  readonly retries: number
  readonly escalations: number
}

export interface EvalConfigSummary {
  readonly configId: string
  readonly label: string
  readonly avgScore: number
  readonly avgTokens: number
  readonly successRate: number
}

export interface EvalReport {
  readonly cells: EvalCell[]
  readonly byConfig: EvalConfigSummary[]
}

function countPhase(entries: readonly EvidenceEntry[], phase: EvidencePhase): number {
  return entries.filter((entry) => entry.phase === phase).length
}

async function runCell(
  task: EvalTask,
  config: EvalConfig,
  language: Language,
  signal?: AbortSignal,
): Promise<EvalCell> {
  const state = { current: sanitizeFormValues(task.input) }
  const evidence = createEvidenceLog()

  const missingFields = getMissingFieldLabels(getRevisionProbe(state.current), language)
  const plan = await createRuleBasedPlanner().plan(
    'improve-listing',
    { values: state.current, language, missingFields },
    signal,
  )
  const graph = parallelGraph(plan)

  const startedAt = Date.now()
  const result = await runGraph(
    graph,
    {
      registry: createDefaultRegistry(),
      snapshots: createSnapshotStore<ItemFormValues>(),
      evidence,
      client: config.client,
      language,
      getState: () => state.current,
      applyPatch: (patch) => {
        state.current = { ...state.current, ...patch }
      },
    },
    config.policy,
    signal,
  )
  const durationMs = Date.now() - startedAt

  return {
    taskId: task.id,
    configId: config.id,
    status: result.status,
    score: scoreListing(state.current, task, language).total,
    tokens: result.tokensUsed.total,
    durationMs,
    retries: countPhase(result.evidence, 'retry'),
    escalations: countPhase(result.evidence, 'escalate'),
  }
}

export async function runEvalMatrix(
  tasks: readonly EvalTask[],
  configs: readonly EvalConfig[],
  language: Language = 'ru',
  signal?: AbortSignal,
): Promise<EvalReport> {
  const cells: EvalCell[] = []

  // Последовательно: не нагружаем шлюз параллелью и держим учёт токенов чистым.
  for (const config of configs) {
    for (const task of tasks) {
      cells.push(await runCell(task, config, language, signal))
    }
  }

  const byConfig: EvalConfigSummary[] = configs.map((config) => {
    const configCells = cells.filter((cell) => cell.configId === config.id)
    const count = configCells.length || 1

    return {
      configId: config.id,
      label: config.label,
      avgScore: configCells.reduce((sum, cell) => sum + cell.score, 0) / count,
      avgTokens: configCells.reduce((sum, cell) => sum + cell.tokens, 0) / count,
      successRate: configCells.filter((cell) => cell.status === 'completed').length / count,
    }
  })

  return { cells, byConfig }
}

export function formatReport(report: EvalReport): string {
  const header = 'config'.padEnd(22) + 'avgScore'.padStart(10) + 'success'.padStart(10) + 'avgTokens'.padStart(12)
  const rows = report.byConfig.map(
    (summary) =>
      summary.label.padEnd(22) +
      summary.avgScore.toFixed(2).padStart(10) +
      `${Math.round(summary.successRate * 100)}%`.padStart(10) +
      Math.round(summary.avgTokens).toString().padStart(12),
  )

  return [header, '-'.repeat(54), ...rows].join('\n')
}
