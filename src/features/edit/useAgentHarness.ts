// Мост между react-hook-form и agent-harness.
// Держит план, evidence (live), снимки и статус прогона в React-состоянии,
// а наружу отдаёт действия: построить план, запустить, остановить, откатить.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import {
  createConfiguredMemoryStore,
  createConfiguredModelClient,
  createDefaultPlanner,
  createDefaultRegistry,
  createEvidenceLog,
  createSnapshotStore,
  DEFAULT_POLICY,
  EMPTY_TOKEN_USAGE,
  runPlan,
  summarizeMemories,
  type EvidenceEntry,
  type EvidenceSink,
  type MemoryStore,
  type Plan,
  type PlanSource,
  type PlanStepStatus,
  type RunStatus,
  type Snapshot,
  type SnapshotStore,
  type TokenUsage,
} from '@/agent-harness'
import { getErrorMessage } from '@/lib/format'
import { getRevisionProbe, sanitizeFormValues } from '@/lib/forms'
import { getMissingFieldLabels } from '@/lib/revision'
import type { ItemFormValues, Language } from '@/types/items'

const AGENT_GOAL = 'improve-listing'

interface UseAgentHarnessParams {
  form: UseFormReturn<ItemFormValues>
  language: Language
}

export interface AgentHarness {
  plan: Plan | null
  planSource: PlanSource | null
  stepStatus: Record<string, PlanStepStatus>
  evidence: EvidenceEntry[]
  snapshots: Snapshot<ItemFormValues>[]
  runStatus: RunStatus | null
  tokensUsed: TokenUsage
  isPlanning: boolean
  isRunning: boolean
  notice: string | null
  memoryHint: string | null
  memoriesCount: number
  buildPlan: () => Promise<void>
  run: () => Promise<void>
  stop: () => void
  rollback: (snapshotId: string) => void
  reset: () => void
  clearMemory: () => Promise<void>
}

export function useAgentHarness({ form, language }: UseAgentHarnessParams): AgentHarness {
  const client = useMemo(() => createConfiguredModelClient(), [])
  const planner = useMemo(() => createDefaultPlanner(client), [client])
  const registry = useMemo(() => createDefaultRegistry(), [])

  const snapshotStoreRef = useRef<SnapshotStore<ItemFormValues> | null>(null)
  if (!snapshotStoreRef.current) {
    snapshotStoreRef.current = createSnapshotStore<ItemFormValues>()
  }
  const snapshotStore = snapshotStoreRef.current

  const sinkRef = useRef<EvidenceSink | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const memoryStoreRef = useRef<MemoryStore | null>(null)
  if (!memoryStoreRef.current) {
    memoryStoreRef.current = createConfiguredMemoryStore()
  }
  const memoryStore = memoryStoreRef.current
  const memoryHintRef = useRef<string>('')

  const [plan, setPlan] = useState<Plan | null>(null)
  const [stepStatus, setStepStatus] = useState<Record<string, PlanStepStatus>>({})
  const [evidence, setEvidence] = useState<EvidenceEntry[]>([])
  const [snapshots, setSnapshots] = useState<Snapshot<ItemFormValues>[]>([])
  const [runStatus, setRunStatus] = useState<RunStatus | null>(null)
  const [tokensUsed, setTokensUsed] = useState<TokenUsage>(EMPTY_TOKEN_USAGE)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [memoryHint, setMemoryHint] = useState<string | null>(null)
  const [memoriesCount, setMemoriesCount] = useState(0)

  useEffect(() => () => abortRef.current?.abort(), [])

  useEffect(() => {
    void memoryStore.all().then((records) => setMemoriesCount(records.length))
  }, [memoryStore])

  const buildPlan = useCallback(async () => {
    const isRu = language === 'ru'
    setIsPlanning(true)
    setNotice(null)
    setRunStatus(null)
    setEvidence([])
    setSnapshots([])
    setTokensUsed(EMPTY_TOKEN_USAGE)
    snapshotStore.clear()
    sinkRef.current = null

    const values = sanitizeFormValues(form.getValues())
    const missingFields = getMissingFieldLabels(getRevisionProbe(values), language)

    const recalled = await memoryStore.recall({ category: values.category, limit: 3 })
    const hint = summarizeMemories(recalled, language)
    memoryHintRef.current = hint
    setMemoryHint(hint || null)

    try {
      const built = await planner.plan(AGENT_GOAL, { values, language, missingFields })
      setPlan(built)

      const initialStatus: Record<string, PlanStepStatus> = {}
      built.steps.forEach((step) => {
        initialStatus[step.id] = step.status
      })
      setStepStatus(initialStatus)

      if (built.source === 'rules') {
        setNotice(
          isRu
            ? 'Планировщик: модель недоступна, план построен правилами.'
            : 'Planner: model unavailable, plan built from rules.',
        )
      }
    } catch (error) {
      setPlan(null)
      setNotice(getErrorMessage(error, language))
    } finally {
      setIsPlanning(false)
    }
  }, [form, language, planner, snapshotStore, memoryStore])

  const run = useCallback(async () => {
    if (!plan || isRunning) {
      return
    }

    setIsRunning(true)
    setRunStatus(null)
    setEvidence([])
    setSnapshots([])
    setTokensUsed(EMPTY_TOKEN_USAGE)
    snapshotStore.clear()

    const pendingStatus: Record<string, PlanStepStatus> = {}
    plan.steps.forEach((step) => {
      pendingStatus[step.id] = 'pending'
    })
    setStepStatus(pendingStatus)

    const isRu = language === 'ru'
    const sink = createEvidenceLog((_, all) => setEvidence([...all]))
    sinkRef.current = sink

    if (memoryHintRef.current) {
      sink.append({
        phase: 'memory',
        level: 'info',
        stepId: null,
        action: isRu ? 'Вспомнил опыт прошлых прогонов' : 'Recalled past-run experience',
        reason: isRu ? 'Передаю подсказку инструментам' : 'Passing the hint to the tools',
        result: memoryHintRef.current,
      })
    }

    const controller = new AbortController()
    abortRef.current = controller

    const setValueOptions = { shouldDirty: true, shouldValidate: true }

    try {
      const result = await runPlan(
        plan,
        {
          registry,
          snapshots: snapshotStore,
          evidence: sink,
          client,
          memoryHint: memoryHintRef.current || undefined,
          language,
          getState: () => sanitizeFormValues(form.getValues()),
          applyPatch: (patch) => {
            if (patch.category !== undefined) {
              form.setValue('category', patch.category, setValueOptions)
            }
            if (patch.title !== undefined) {
              form.setValue('title', patch.title, setValueOptions)
            }
            if (patch.price !== undefined) {
              form.setValue('price', patch.price, setValueOptions)
            }
            if (patch.description !== undefined) {
              form.setValue('description', patch.description, setValueOptions)
            }
            if (patch.params !== undefined) {
              form.setValue('params', patch.params, setValueOptions)
            }
          },
          onStepStatus: (stepId, status) => {
            setStepStatus((previous) => ({ ...previous, [stepId]: status }))
          },
        },
        DEFAULT_POLICY,
        controller.signal,
      )

      setRunStatus(result.status)
      setTokensUsed(result.tokensUsed)
      setSnapshots([...snapshotStore.list()])

      const finalValues = sanitizeFormValues(form.getValues())
      const descriptionLength = finalValues.description.trim().length
      const content = isRu
        ? `${finalValues.category}: цена ${finalValues.price || '—'} ₽, описание ${descriptionLength} симв. — ${result.status} (${client.model})`
        : `${finalValues.category}: price ${finalValues.price || '—'}, description ${descriptionLength} chars — ${result.status} (${client.model})`

      await memoryStore.remember({
        category: finalValues.category,
        content,
        tags: ['run-outcome', result.status],
        data: {
          price: Number(finalValues.price) || 0,
          descriptionLength,
          status: result.status,
          model: client.model,
        },
      })

      sink.append({
        phase: 'memory',
        level: 'success',
        stepId: null,
        action: isRu ? 'Записал опыт прогона' : 'Stored run experience',
        reason: isRu
          ? 'Учту в будущих прогонах этой категории'
          : 'Will reuse it in future runs of this category',
        result: content,
      })

      setMemoriesCount((await memoryStore.all()).length)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setIsRunning(false)
    }
  }, [plan, isRunning, registry, snapshotStore, client, language, form, memoryStore])

  const stop = useCallback(() => {
    abortRef.current?.abort()
  }, [])

  const rollback = useCallback(
    (snapshotId: string) => {
      const isRu = language === 'ru'

      try {
        const restored = snapshotStore.restore(snapshotId)
        form.reset(restored)

        const snapshot = snapshotStore.list().find((entry) => entry.id === snapshotId)
        sinkRef.current?.append({
          phase: 'rollback',
          level: 'warning',
          stepId: null,
          action: isRu ? 'Откат состояния' : 'State rolled back',
          reason: isRu
            ? 'Пользователь откатил изменения агента к снимку'
            : 'User rolled back the agent changes to a snapshot',
          result: snapshot?.label ?? snapshotId,
        })
      } catch (error) {
        setNotice(getErrorMessage(error, language))
      }
    },
    [form, language, snapshotStore],
  )

  const reset = useCallback(() => {
    abortRef.current?.abort()
    snapshotStore.clear()
    sinkRef.current = null
    setPlan(null)
    setStepStatus({})
    setEvidence([])
    setSnapshots([])
    setRunStatus(null)
    setTokensUsed(EMPTY_TOKEN_USAGE)
    setNotice(null)
  }, [snapshotStore])

  const clearMemory = useCallback(async () => {
    await memoryStore.clear()
    memoryHintRef.current = ''
    setMemoryHint(null)
    setMemoriesCount(0)
  }, [memoryStore])

  return {
    plan,
    planSource: plan?.source ?? null,
    stepStatus,
    evidence,
    snapshots,
    runStatus,
    tokensUsed,
    isPlanning,
    isRunning,
    notice,
    memoryHint,
    memoriesCount,
    buildPlan,
    run,
    stop,
    rollback,
    reset,
    clearMemory,
  }
}
