// Панель harness в форме редактирования: план шагов, evidence-журнал и откат к снимкам.
// Чисто презентационный компонент — вся логика в useAgentHarness.

import { useEffect, useRef } from 'react'

import { StatusBanner } from '@/components/StatusBanner'
import { DEFAULT_POLICY, type EvidencePhase, type PlanStepStatus, type RunStatus } from '@/agent-harness'
import type { Language } from '@/types/items'

import type { AgentHarness } from './useAgentHarness'

import './AgentHarnessPanel.css'

interface AgentHarnessPanelProps {
  harness: AgentHarness
  language: Language
}

function phaseLabel(phase: EvidencePhase, isRu: boolean): string {
  switch (phase) {
    case 'plan':
      return isRu ? 'План' : 'Plan'
    case 'snapshot':
      return isRu ? 'Снимок' : 'Snapshot'
    case 'model-call':
      return isRu ? 'Модель' : 'Model'
    case 'verify':
      return isRu ? 'Проверка' : 'Verify'
    case 'retry':
      return isRu ? 'Рефайн' : 'Refine'
    case 'escalate':
      return isRu ? 'Эскалация' : 'Escalate'
    case 'memory':
      return isRu ? 'Память' : 'Memory'
    case 'rollback':
      return isRu ? 'Откат' : 'Rollback'
    case 'step':
      return isRu ? 'Шаг' : 'Step'
  }
}

function stepStatusLabel(status: PlanStepStatus, isRu: boolean): string {
  switch (status) {
    case 'pending':
      return isRu ? 'Ожидает' : 'Pending'
    case 'running':
      return isRu ? 'Выполняется' : 'Running'
    case 'done':
      return isRu ? 'Готово' : 'Done'
    case 'failed':
      return isRu ? 'Ошибка' : 'Failed'
    case 'skipped':
      return isRu ? 'Пропущен' : 'Skipped'
  }
}

function runStatusLabel(status: RunStatus, isRu: boolean): string {
  switch (status) {
    case 'completed':
      return isRu ? 'Завершено' : 'Completed'
    case 'failed':
      return isRu ? 'Сбой' : 'Failed'
    case 'aborted':
      return isRu ? 'Остановлено' : 'Aborted'
    case 'budget-exceeded':
      return isRu ? 'Превышен бюджет токенов' : 'Token budget exceeded'
    case 'escalated':
      return isRu ? 'Эскалировано (нужен человек)' : 'Escalated (human needed)'
  }
}

export function AgentHarnessPanel({ harness, language }: AgentHarnessPanelProps) {
  const isRu = language === 'ru'
  const locale = isRu ? 'ru-RU' : 'en-US'
  const evidenceRef = useRef<HTMLDivElement | null>(null)

  const {
    plan,
    planSource,
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
  } = harness

  useEffect(() => {
    evidenceRef.current?.scrollTo({ top: evidenceRef.current.scrollHeight, behavior: 'smooth' })
  }, [evidence])

  return (
    <section className="card-section agent-panel">
      <div className="section-heading">
        <div>
          <h2>{isRu ? 'AI-агент · plan mode' : 'AI agent · plan mode'}</h2>
          <p className="muted-text">
            {isRu
              ? 'Агент строит план, исполняет шаги под контролем (ретраи, таймаут, бюджет токенов) и логирует каждое действие. Любой шаг можно откатить.'
              : 'The agent builds a plan, runs steps under control (retries, timeout, token budget) and logs every action. Any step can be rolled back.'}
          </p>
        </div>
      </div>

      <div className="inline-actions agent-panel__toolbar">
        <button
          type="button"
          className="button button--ghost"
          onClick={() => void buildPlan()}
          disabled={isPlanning || isRunning}
        >
          {isPlanning
            ? isRu
              ? 'Строим план…'
              : 'Planning…'
            : isRu
              ? 'Построить план'
              : 'Build plan'}
        </button>

        {plan && !isRunning ? (
          <button type="button" className="button button--primary" onClick={() => void run()}>
            {isRu ? 'Запустить агента' : 'Run agent'}
          </button>
        ) : null}

        {isRunning ? (
          <button type="button" className="button button--secondary" onClick={stop}>
            {isRu ? 'Остановить' : 'Stop'}
          </button>
        ) : null}

        {plan && !isRunning ? (
          <button
            type="button"
            className="button button--secondary button--small"
            onClick={reset}
          >
            {isRu ? 'Сбросить' : 'Reset'}
          </button>
        ) : null}

        {runStatus ? (
          <span className={`agent-status agent-status--${runStatus}`}>
            {runStatusLabel(runStatus, isRu)} · {tokensUsed.total}/{DEFAULT_POLICY.tokenBudget}{' '}
            {isRu ? 'токенов' : 'tokens'}
          </span>
        ) : null}
      </div>

      {notice ? (
        <StatusBanner
          tone="info"
          title={isRu ? 'Замечание harness' : 'Harness notice'}
          description={notice}
        />
      ) : null}

      {memoriesCount > 0 || memoryHint ? (
        <div className="agent-memory">
          <div className="agent-memory__head">
            <span className="badge badge--ghost">
              {isRu ? 'Память' : 'Memory'}: {memoriesCount}
            </span>
            {memoriesCount > 0 ? (
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={() => void clearMemory()}
                disabled={isRunning}
              >
                {isRu ? 'Очистить память' : 'Clear memory'}
              </button>
            ) : null}
          </div>
          {memoryHint ? <pre className="agent-memory__hint">{memoryHint}</pre> : null}
        </div>
      ) : null}

      {plan ? (
        <div className="plan-block">
          <div className="plan-block__head">
            <h3>{isRu ? 'План' : 'Plan'}</h3>
            <span className="badge badge--ghost">
              {planSource === 'llm'
                ? isRu
                  ? 'Построен моделью'
                  : 'Built by model'
                : isRu
                  ? 'Построен правилами'
                  : 'Built by rules'}
            </span>
          </div>

          {plan.steps.length ? (
            <ol className="plan-list">
              {plan.steps.map((step, index) => {
                const status = stepStatus[step.id] ?? step.status
                return (
                  <li key={step.id} className={`plan-step plan-step--${status}`}>
                    <span className="plan-step__index">{index + 1}</span>
                    <div className="plan-step__body">
                      <p className="plan-step__title">{step.title}</p>
                      <p className="plan-step__reason muted-text">{step.reason}</p>
                    </div>
                    <span className={`plan-step__status plan-step__status--${status}`}>
                      {stepStatusLabel(status, isRu)}
                    </span>
                  </li>
                )
              })}
            </ol>
          ) : (
            <p className="muted-text">
              {isRu ? 'План пуст — карточка уже в порядке.' : 'Plan is empty — the listing is fine.'}
            </p>
          )}
        </div>
      ) : null}

      {evidence.length ? (
        <div className="evidence-block">
          <h3>{isRu ? 'Evidence log' : 'Evidence log'}</h3>
          <div className="evidence-log" ref={evidenceRef}>
            {evidence.map((entry) => (
              <article key={entry.id} className={`evidence-entry evidence-entry--${entry.level}`}>
                <div className="evidence-entry__head">
                  <span className="evidence-entry__phase">{phaseLabel(entry.phase, isRu)}</span>
                  <span className="evidence-entry__action">{entry.action}</span>
                  <span className="evidence-entry__time muted-text">
                    {new Date(entry.at).toLocaleTimeString(locale)}
                    {entry.attempt ? ` · #${entry.attempt}` : ''}
                    {typeof entry.durationMs === 'number' ? ` · ${entry.durationMs}ms` : ''}
                  </span>
                </div>
                <p className="evidence-entry__reason muted-text">{entry.reason}</p>
                <p className="evidence-entry__result">{entry.result}</p>
              </article>
            ))}
          </div>
        </div>
      ) : null}

      {snapshots.length ? (
        <div className="snapshot-block">
          <h3>{isRu ? 'Снимки состояния' : 'State snapshots'}</h3>
          <ul className="snapshot-list">
            {snapshots.map((snapshot) => (
              <li key={snapshot.id} className="snapshot-row">
                <div>
                  <p className="snapshot-row__label">{snapshot.label}</p>
                  <p className="muted-text">{new Date(snapshot.at).toLocaleTimeString(locale)}</p>
                </div>
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() => rollback(snapshot.id)}
                >
                  {isRu ? 'Откатить сюда' : 'Roll back here'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
