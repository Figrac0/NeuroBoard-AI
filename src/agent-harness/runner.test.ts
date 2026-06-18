import { describe, expect, it } from 'vitest'

import { EMPTY_FORM_VALUES } from '@/lib/forms'
import type { ItemFormValues } from '@/types/items'

import { createEvidenceLog, type EvidenceEntry, type EvidencePhase } from './evidence'
import { type ModelClient } from './model-client'
import { type CapabilityKind, type Plan } from './planner'
import { createSnapshotStore } from './snapshot'
import { runPlan, type AgentTool, type RunnerDeps, type RunnerPolicy, type ToolRegistry } from './runner'

const FAST_POLICY: RunnerPolicy = {
  maxRetries: 2,
  maxRefines: 1,
  maxParallel: 4,
  timeoutMs: 1000,
  tokenBudget: 1_000_000,
  backoffMs: 0,
}

// Клиент модели, отдающий заранее заданные ответы по порядку.
function makeClient(responses: string[], tokensEach = 10): ModelClient {
  let index = 0

  return {
    id: 'ollama',
    model: 'test',
    async complete() {
      const text = responses[Math.min(index, responses.length - 1)]
      index += 1
      const prompt = Math.floor(tokensEach / 2)
      return { text, tokens: { prompt, completion: tokensEach - prompt, total: tokensEach } }
    },
  }
}

// Инструмент-эхо: пишет ответ модели в description, verify проходит по предикату.
function makeEchoTool(kind: CapabilityKind, okWhen: (text: string) => boolean): AgentTool<{ text: string }> {
  return {
    kind,
    async run(ctx) {
      const { text } = await ctx.callModel('prompt', 'reason')
      return { output: { text }, patch: { description: text }, summary: text }
    },
    verify({ result }) {
      const ok = okWhen(result.output.text)
      return { ok, score: ok ? 1 : 0, feedback: ok ? '' : 'not good enough' }
    },
  }
}

function makeRegistry(tool: AgentTool<{ text: string }>): ToolRegistry {
  return {
    'suggest-category': tool,
    'fill-attributes': tool,
    'improve-title': tool,
    'improve-description': tool,
    'estimate-price': tool,
  }
}

function makePlan(kinds: CapabilityKind[]): Plan {
  return {
    id: 'plan',
    goal: 'improve-listing',
    createdAt: 0,
    source: 'rules',
    steps: kinds.map((kind, position) => ({
      id: `step-${position}`,
      kind,
      title: kind,
      reason: 'reason',
      status: 'pending',
    })),
  }
}

function makeDeps(
  registry: ToolRegistry,
  client: ModelClient,
  stateRef: { current: ItemFormValues },
  extra?: Partial<RunnerDeps>,
): RunnerDeps {
  return {
    registry,
    snapshots: createSnapshotStore<ItemFormValues>(),
    evidence: createEvidenceLog(),
    client,
    language: 'en',
    getState: () => stateRef.current,
    applyPatch: (patch) => {
      stateRef.current = { ...stateRef.current, ...patch }
    },
    ...extra,
  }
}

function countPhase(entries: readonly EvidenceEntry[], phase: EvidencePhase): number {
  return entries.filter((entry) => entry.phase === phase).length
}

describe('runPlan', () => {
  it('completes a plan and applies the verified patch', async () => {
    const state = { current: EMPTY_FORM_VALUES }
    const deps = makeDeps(
      makeRegistry(makeEchoTool('improve-description', (text) => text === 'good')),
      makeClient(['good']),
      state,
    )

    const result = await runPlan(makePlan(['improve-description']), deps, FAST_POLICY)

    expect(result.status).toBe('completed')
    expect(state.current.description).toBe('good')
    expect(result.tokensUsed.total).toBe(10)
  })

  it('refines once on verifier feedback, then succeeds', async () => {
    const state = { current: EMPTY_FORM_VALUES }
    const deps = makeDeps(
      makeRegistry(makeEchoTool('improve-description', (text) => text === 'good')),
      makeClient(['bad', 'good']),
      state,
    )

    const result = await runPlan(makePlan(['improve-description']), deps, FAST_POLICY)

    expect(result.status).toBe('completed')
    expect(state.current.description).toBe('good')
    // одна неудачная проверка + одна успешная, и один рефайн-раунд
    expect(countPhase(result.evidence, 'verify')).toBe(2)
    expect(countPhase(result.evidence, 'retry')).toBe(1)
  })

  it('escalates to needs-human when refines are exhausted', async () => {
    const state = { current: EMPTY_FORM_VALUES }
    const deps = makeDeps(
      makeRegistry(makeEchoTool('improve-description', (text) => text === 'good')),
      makeClient(['bad', 'bad']),
      state,
    )

    const result = await runPlan(makePlan(['improve-description']), deps, FAST_POLICY)

    expect(result.status).toBe('escalated')
    // патч не применён — состояние осталось исходным
    expect(state.current.description).toBe('')
    expect(countPhase(result.evidence, 'escalate')).toBeGreaterThan(0)
  })

  it('resolves via escalation client when configured', async () => {
    const state = { current: EMPTY_FORM_VALUES }
    const deps = makeDeps(
      makeRegistry(makeEchoTool('improve-description', (text) => text === 'good')),
      makeClient(['bad', 'bad']),
      state,
      { escalationClient: makeClient(['good']) },
    )

    const result = await runPlan(makePlan(['improve-description']), deps, FAST_POLICY)

    expect(result.status).toBe('completed')
    expect(state.current.description).toBe('good')
  })

  it('stops with budget-exceeded once the token budget is spent', async () => {
    const state = { current: EMPTY_FORM_VALUES }
    const deps = makeDeps(
      makeRegistry(makeEchoTool('improve-description', () => true)),
      makeClient(['good'], 10),
      state,
    )

    const result = await runPlan(makePlan(['improve-description', 'estimate-price']), deps, {
      ...FAST_POLICY,
      tokenBudget: 5,
    })

    expect(result.status).toBe('budget-exceeded')
  })

  it('retries a hard failure before succeeding', async () => {
    const state = { current: EMPTY_FORM_VALUES }
    let calls = 0
    const flakyTool: AgentTool<{ text: string }> = {
      kind: 'improve-description',
      async run(ctx) {
        const { text } = await ctx.callModel('p', 'r')
        calls += 1
        if (calls === 1) {
          throw new Error('transient failure')
        }
        return { output: { text }, patch: { description: text }, summary: text }
      },
      verify() {
        return { ok: true, score: 1, feedback: '' }
      },
    }

    const deps = makeDeps(makeRegistry(flakyTool), makeClient(['ok', 'ok']), state)
    const result = await runPlan(makePlan(['improve-description']), deps, FAST_POLICY)

    expect(result.status).toBe('completed')
    expect(countPhase(result.evidence, 'retry')).toBe(1)
  })
})
