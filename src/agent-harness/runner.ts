// Runner — оркестрация прогона агента под контролем политики.
// Исполнитель работает над goal-graph: топологические слои, узлы одного слоя идут
// параллельно (с лимитом). Линейный план = цепочка-граф, поэтому runPlan и runGraph
// используют один исполнитель. На каждый узел: снимок -> исполнение (ретраи/таймаут/
// бюджет) -> ВЕРИФИКАЦИЯ -> рефайн по фидбегу -> эскалация -> патч -> evidence.

import {
  addTokens,
  EMPTY_TOKEN_USAGE,
  type EvidenceEntry,
  type EvidenceSink,
  type TokenUsage,
} from './evidence'
import { buildLayers, linearGraph, type GoalGraph, type GoalNode } from './goal-graph'
import { type ModelClient } from './model-client'
import { type CapabilityKind, type Plan, type PlanStepStatus } from './planner'
import { type Snapshot, type SnapshotStore } from './snapshot'
import type { ItemFormValues, Language } from '@/types/items'

export interface RunnerPolicy {
  readonly maxRetries: number // повторов на жёсткое падение шага (сеть/таймаут/исключение)
  readonly maxRefines: number // рефайн-раундов по фидбегу верификатора
  readonly maxParallel: number // сколько узлов слоя исполнять одновременно
  readonly timeoutMs: number // таймаут одного шага (закрывает дыру неиспользуемого requestTimeoutMs)
  readonly tokenBudget: number // суммарный бюджет токенов на прогон
  readonly backoffMs: number // базовая задержка между повторами
  readonly verify?: boolean // включить верификацию результата (по умолчанию true); false = «наивный» прогон
}

// tokenBudget с запасом: шлюзы вроде OmniRoute/Kiro добавляют большой системный
// префикс (~6k токенов на вызов), а полный план — до 5 шагов (категория, характеристики,
// заголовок, описание, цена), поэтому бюджет рассчитан с запасом.
export const DEFAULT_POLICY: RunnerPolicy = {
  maxRetries: 2,
  maxRefines: 1,
  maxParallel: 4,
  timeoutMs: 30000,
  tokenBudget: 60000,
  backoffMs: 600,
}

export interface ModelCallResult {
  readonly text: string
  readonly tokens: TokenUsage
}

// Результат проверки шага (feedback loop).
export interface VerificationResult {
  readonly ok: boolean
  readonly score: number // 0..1
  readonly feedback: string
}

export interface VerifyArgs<TOutput> {
  readonly values: ItemFormValues
  readonly result: ToolResult<TOutput>
  readonly language: Language
}

// Контекст, который инструмент получает на входе при исполнении шага.
export interface ToolContext {
  readonly signal: AbortSignal // внешняя отмена, объединённая с таймаутом шага
  readonly language: Language
  readonly values: ItemFormValues // состояние формы на момент шага
  readonly evidence: EvidenceSink
  readonly feedback?: string // замечание верификатора для рефайна
  readonly memoryHint?: string // опыт прошлых прогонов для инструмента
  // Вызов модели через harness: учитывает токены и пишет model-call в evidence.
  callModel(prompt: string, reason: string): Promise<ModelCallResult>
}

export interface ToolResult<TOutput> {
  readonly output: TOutput // напр. PriceSuggestion / DescriptionSuggestion
  readonly patch: Partial<ItemFormValues> // как шаг меняет форму (применяется и снимается через snapshot)
  readonly summary: string // строка результата для evidence
}

// Инструмент = одна возможность агента. verify (опционально) замыкает feedback loop.
export interface AgentTool<TOutput> {
  readonly kind: CapabilityKind
  run(ctx: ToolContext): Promise<ToolResult<TOutput>>
  verify?(args: VerifyArgs<TOutput>): VerificationResult
}

// Реестр связывает узел графа (kind) и исполнение (инструмент).
export type ToolRegistry = { readonly [K in CapabilityKind]: AgentTool<unknown> }

export interface RunnerDeps {
  readonly registry: ToolRegistry
  readonly snapshots: SnapshotStore<ItemFormValues>
  readonly evidence: EvidenceSink
  readonly client: ModelClient
  readonly escalationClient?: ModelClient // более сильная модель для эскалации (опционально)
  readonly memoryHint?: string // опыт прошлых прогонов, прокидывается инструментам
  readonly language: Language
  getState(): ItemFormValues // актуальное состояние формы (RHF getValues)
  applyPatch(patch: Partial<ItemFormValues>): void // применение патча (RHF setValue)
  onStepStatus?(stepId: string, status: PlanStepStatus): void // для подсветки узлов в UI
}

export type RunStatus = 'completed' | 'failed' | 'aborted' | 'budget-exceeded' | 'escalated'

export interface RunResult {
  readonly status: RunStatus
  readonly graph: GoalGraph
  readonly evidence: readonly EvidenceEntry[]
  readonly snapshots: readonly Snapshot<ItemFormValues>[]
  readonly tokensUsed: TokenUsage
}

interface StepDescriptor {
  readonly id: string
  readonly kind: CapabilityKind
  readonly title: string
  readonly reason: string
}

type StepOutcome = 'done' | 'failed' | 'budget' | 'aborted' | 'escalated'

const PASS: VerificationResult = { ok: true, score: 1, feedback: '' }

class BudgetExceededError extends Error {
  constructor() {
    super('Token budget exceeded')
    this.name = 'BudgetExceededError'
  }
}

interface ManagedSignal {
  readonly signal: AbortSignal
  dispose(): void
}

// Объединяет внешний signal и таймаут шага в один AbortSignal.
function createTimeoutSignal(external: AbortSignal | undefined, timeoutMs: number): ManagedSignal {
  const controller = new AbortController()

  const onExternalAbort = () => controller.abort(external?.reason)

  if (external) {
    if (external.aborted) {
      controller.abort(external.reason)
    } else {
      external.addEventListener('abort', onExternalAbort, { once: true })
    }
  }

  const timer = setTimeout(() => {
    controller.abort(new DOMException('Step timed out', 'TimeoutError'))
  }, timeoutMs)

  return {
    signal: controller.signal,
    dispose() {
      clearTimeout(timer)
      external?.removeEventListener('abort', onExternalAbort)
    },
  }
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason)
      return
    }

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      clearTimeout(timer)
      reject(signal?.reason)
    }

    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

function isExternalAbort(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true
}

function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : 'Unknown error'
}

// Пул с ограничением параллельности: исполняет fn над items не более limit одновременно.
async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length)
  let cursor = 0

  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 1
  const workerCount = Math.max(1, Math.min(safeLimit, items.length))
  const workers = Array.from({ length: workerCount }, async () => {
    for (;;) {
      const index = cursor
      cursor += 1
      if (index >= items.length) {
        return
      }
      results[index] = await fn(items[index])
    }
  })

  await Promise.all(workers)
  return results
}

function pickWorstOutcome(outcomes: readonly StepOutcome[]): Exclude<StepOutcome, 'done'> | null {
  const priority: Exclude<StepOutcome, 'done'>[] = ['aborted', 'budget', 'escalated', 'failed']
  for (const candidate of priority) {
    if (outcomes.includes(candidate)) {
      return candidate
    }
  }
  return null
}

// Сессия прогона: держит бюджет токенов и умеет исполнить один шаг со всей обвязкой.
function createRunSession(
  deps: RunnerDeps,
  policy: RunnerPolicy,
  externalSignal: AbortSignal | undefined,
) {
  const { registry, evidence, client, language } = deps
  const isRu = language === 'ru'
  const budget = { used: EMPTY_TOKEN_USAGE }

  async function callModelGuarded(
    prompt: string,
    reason: string,
    stepId: string,
    signal: AbortSignal,
    modelClient: ModelClient,
  ): Promise<ModelCallResult> {
    if (budget.used.total >= policy.tokenBudget) {
      throw new BudgetExceededError()
    }

    const startedAt = Date.now()
    const response = await modelClient.complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.35,
      signal,
    })

    budget.used = addTokens(budget.used, response.tokens)

    evidence.append({
      phase: 'model-call',
      level: 'info',
      stepId,
      action: `${isRu ? 'Запрос к модели' : 'Model call'} · ${modelClient.id}:${modelClient.model}`,
      reason,
      result: `${isRu ? 'Токенов' : 'Tokens'}: ${response.tokens.total} (${budget.used.total}/${policy.tokenBudget})`,
      tokens: response.tokens,
      durationMs: Date.now() - startedAt,
    })

    return { text: response.text, tokens: response.tokens }
  }

  function verifyResult(
    tool: AgentTool<unknown>,
    result: ToolResult<unknown>,
    stepId: string,
  ): VerificationResult {
    const verification = tool.verify
      ? tool.verify({ values: deps.getState(), result, language })
      : PASS

    evidence.append({
      phase: 'verify',
      level: verification.ok ? 'success' : 'warning',
      stepId,
      action: isRu ? 'Проверка результата' : 'Result verification',
      reason: isRu
        ? `Оценка качества: ${verification.score.toFixed(2)}`
        : `Quality score: ${verification.score.toFixed(2)}`,
      result: verification.ok ? (isRu ? 'Проверка пройдена' : 'Passed') : verification.feedback,
    })

    return verification
  }

  async function escalate(
    stepId: string,
    kind: CapabilityKind,
    title: string,
    lastFeedback: string,
  ): Promise<StepOutcome> {
    const tool = registry[kind]
    const escalationClient = deps.escalationClient

    evidence.append({
      phase: 'escalate',
      level: 'warning',
      stepId,
      action: isRu ? 'Эскалация шага' : 'Step escalation',
      reason: isRu
        ? 'Результат не прошёл проверку после рефайнов'
        : 'Result failed verification after refines',
      result: lastFeedback,
    })

    if (escalationClient) {
      const managed = createTimeoutSignal(externalSignal, policy.timeoutMs)
      const startedAt = Date.now()
      const ctx: ToolContext = {
        signal: managed.signal,
        language,
        values: deps.getState(),
        evidence,
        feedback: lastFeedback,
        memoryHint: deps.memoryHint,
        callModel: (prompt, why) =>
          callModelGuarded(prompt, why, stepId, managed.signal, escalationClient),
      }

      try {
        const result = await tool.run(ctx)
        const verification = verifyResult(tool, result, stepId)

        if (verification.ok) {
          deps.applyPatch(result.patch)
          evidence.append({
            phase: 'escalate',
            level: 'success',
            stepId,
            action: isRu ? 'Эскалация помогла' : 'Escalation resolved',
            reason: `${isRu ? 'Сильная модель' : 'Stronger model'} · ${escalationClient.id}:${escalationClient.model}`,
            result: result.summary,
            durationMs: Date.now() - startedAt,
          })
          return 'done'
        }
      } catch (error) {
        if (isExternalAbort(externalSignal)) {
          managed.dispose()
          return 'aborted'
        }
        evidence.append({
          phase: 'escalate',
          level: 'error',
          stepId,
          action: isRu ? 'Эскалация упала' : 'Escalation failed',
          reason: errorMessage(error),
          result: '—',
        })
      } finally {
        managed.dispose()
      }
    }

    evidence.append({
      phase: 'escalate',
      level: 'error',
      stepId,
      action: isRu ? 'Требуется человек' : 'Human review required',
      reason: isRu
        ? 'Автокоррекция не помогла, нужна проверка человеком'
        : 'Auto-correction failed, human review needed',
      result: title,
    })

    return 'escalated'
  }

  async function runStep(step: StepDescriptor): Promise<StepOutcome> {
    const tool = registry[step.kind]
    let hardAttempt = 0
    let refineRound = 0
    let feedback: string | undefined

    for (;;) {
      if (isExternalAbort(externalSignal)) {
        return 'aborted'
      }

      const managed = createTimeoutSignal(externalSignal, policy.timeoutMs)
      const startedAt = Date.now()
      const ctx: ToolContext = {
        signal: managed.signal,
        language,
        values: deps.getState(),
        evidence,
        feedback,
        memoryHint: deps.memoryHint,
        callModel: (prompt, why) => callModelGuarded(prompt, why, step.id, managed.signal, client),
      }

      let result: ToolResult<unknown>

      try {
        result = await tool.run(ctx)
      } catch (error) {
        managed.dispose()

        if (error instanceof BudgetExceededError) {
          evidence.append({
            phase: 'step',
            level: 'error',
            stepId: step.id,
            action: step.title,
            reason: isRu ? 'Превышен бюджет токенов' : 'Token budget exceeded',
            result: `${budget.used.total}/${policy.tokenBudget}`,
          })
          return 'budget'
        }

        if (isExternalAbort(externalSignal)) {
          evidence.append({
            phase: 'step',
            level: 'warning',
            stepId: step.id,
            action: step.title,
            reason: isRu ? 'Прервано пользователем' : 'Aborted by user',
            result: '—',
          })
          return 'aborted'
        }

        hardAttempt += 1
        const willRetry = hardAttempt <= policy.maxRetries

        evidence.append({
          phase: willRetry ? 'retry' : 'step',
          level: willRetry ? 'warning' : 'error',
          stepId: step.id,
          attempt: hardAttempt,
          action: step.title,
          reason: willRetry
            ? isRu
              ? `Сбой, попытка ${hardAttempt} из ${policy.maxRetries}`
              : `Failure, retry ${hardAttempt} of ${policy.maxRetries}`
            : isRu
              ? 'Все попытки исчерпаны'
              : 'All attempts exhausted',
          result: errorMessage(error),
          durationMs: Date.now() - startedAt,
        })

        if (!willRetry) {
          return 'failed'
        }

        try {
          await delay(policy.backoffMs * hardAttempt, externalSignal)
        } catch {
          return 'aborted'
        }

        continue
      }

      managed.dispose()

      const verification =
        policy.verify === false ? PASS : verifyResult(tool, result, step.id)

      if (verification.ok) {
        deps.applyPatch(result.patch)
        evidence.append({
          phase: 'step',
          level: 'success',
          stepId: step.id,
          action: step.title,
          reason: step.reason,
          result: result.summary,
          durationMs: Date.now() - startedAt,
        })
        return 'done'
      }

      if (refineRound < policy.maxRefines) {
        refineRound += 1
        feedback = verification.feedback
        evidence.append({
          phase: 'retry',
          level: 'warning',
          stepId: step.id,
          attempt: refineRound,
          action: step.title,
          reason: isRu ? 'Рефайн по фидбегу проверки' : 'Refine on verifier feedback',
          result: verification.feedback,
        })
        continue
      }

      return escalate(step.id, step.kind, step.title, verification.feedback)
    }
  }

  return { budget, runStep }
}

async function executeGraph(
  graph: GoalGraph,
  deps: RunnerDeps,
  policy: RunnerPolicy,
  externalSignal: AbortSignal | undefined,
): Promise<RunResult> {
  const { snapshots, evidence, language } = deps
  const isRu = language === 'ru'
  const session = createRunSession(deps, policy, externalSignal)

  const finish = (status: RunStatus): RunResult => {
    evidence.append({
      phase: 'step',
      level:
        status === 'completed'
          ? 'success'
          : status === 'failed' || status === 'budget-exceeded'
            ? 'error'
            : 'warning',
      stepId: null,
      action: isRu ? 'Прогон завершён' : 'Run finished',
      reason: isRu ? `Статус: ${status}` : `Status: ${status}`,
      result: isRu
        ? `Использовано токенов: ${session.budget.used.total}`
        : `Tokens used: ${session.budget.used.total}`,
      tokens: session.budget.used,
    })

    return {
      status,
      graph,
      evidence: evidence.entries(),
      snapshots: snapshots.list(),
      tokensUsed: session.budget.used,
    }
  }

  let layers: GoalNode[][]
  try {
    layers = buildLayers(graph)
  } catch (error) {
    evidence.append({
      phase: 'plan',
      level: 'error',
      stepId: null,
      action: isRu ? 'Граф целей невалиден' : 'Goal graph is invalid',
      reason: errorMessage(error),
      result: '—',
    })
    return finish('failed')
  }

  evidence.append({
    phase: 'plan',
    level: 'info',
    stepId: null,
    action: isRu
      ? `Граф целей построен (${graph.source === 'llm' ? 'моделью' : 'правилами'})`
      : `Goal graph built (${graph.source === 'llm' ? 'by model' : 'by rules'})`,
    reason: isRu
      ? `Узлов: ${graph.nodes.length}; слоёв: ${layers.length}; параллельно до ${policy.maxParallel}`
      : `Nodes: ${graph.nodes.length}; layers: ${layers.length}; up to ${policy.maxParallel} parallel`,
    result:
      layers.map((layer, index) => `L${index + 1}: ${layer.map((node) => node.title).join(' + ')}`).join(' → ') ||
      '—',
  })

  for (const layer of layers) {
    if (isExternalAbort(externalSignal)) {
      return finish('aborted')
    }

    // Снимки до исполнения слоя — согласованная точка отката для каждого узла.
    for (const node of layer) {
      const snapshot = snapshots.capture(
        isRu ? `До шага: ${node.title}` : `Before step: ${node.title}`,
        deps.getState(),
      )
      evidence.append({
        phase: 'snapshot',
        level: 'info',
        stepId: node.id,
        action: isRu ? 'Снимок состояния сохранён' : 'State snapshot captured',
        reason: isRu
          ? 'Чтобы изменения шага можно было откатить'
          : 'So the step changes can be rolled back',
        result: snapshot.label,
      })
      deps.onStepStatus?.(node.id, 'running')
    }

    const outcomes = await mapWithConcurrency(layer, policy.maxParallel, async (node) => {
      const outcome = await session.runStep(node)
      deps.onStepStatus?.(node.id, outcome === 'done' ? 'done' : 'failed')
      return outcome
    })

    const worst = pickWorstOutcome(outcomes)
    if (worst === 'budget') {
      return finish('budget-exceeded')
    }
    if (worst === 'aborted') {
      return finish('aborted')
    }
    if (worst === 'escalated') {
      return finish('escalated')
    }
    if (worst === 'failed') {
      return finish('failed')
    }
  }

  return finish('completed')
}

// Линейный прогон плана (обратная совместимость): план превращается в цепочку-граф.
export function runPlan(
  plan: Plan,
  deps: RunnerDeps,
  policy: RunnerPolicy = DEFAULT_POLICY,
  externalSignal?: AbortSignal,
): Promise<RunResult> {
  return executeGraph(linearGraph(plan), deps, policy, externalSignal)
}

// Прогон произвольного goal-graph: узлы слоя исполняются параллельно.
export function runGraph(
  graph: GoalGraph,
  deps: RunnerDeps,
  policy: RunnerPolicy = DEFAULT_POLICY,
  externalSignal?: AbortSignal,
): Promise<RunResult> {
  return executeGraph(graph, deps, policy, externalSignal)
}
