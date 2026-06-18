// Harness Lab — витрина evals. Прогоняет golden-задачи под выбранными конфигами
// (модель × политика) вживую через OmniRoute/Ollama и показывает таблицу сравнения.
// Это наглядный артефакт «evals + как замерил + сравнение моделей/конфигов».

import { useMemo, useRef, useState } from 'react'

import {
  createDefaultEvalConfigs,
  GOLDEN_TASKS,
  runEvalMatrix,
  type EvalConfig,
  type EvalReport,
} from '@/agent-harness'
import { getErrorMessage, isAbortError } from '@/lib/format'
import { useLanguageStore } from '@/stores/languageStore'

import './HarnessLabPage.css'

export function HarnessLabPage() {
  const language = useLanguageStore((store) => store.language)
  const isRu = language === 'ru'

  const allConfigs = useMemo<EvalConfig[]>(() => createDefaultEvalConfigs(), [])
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(['sonnet-harness', 'sonnet-naive']),
  )
  const [report, setReport] = useState<EvalReport | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const toggle = (id: string) => {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const run = async () => {
    const configs = allConfigs.filter((config) => selected.has(config.id))
    if (configs.length === 0 || isRunning) {
      return
    }

    setIsRunning(true)
    setError(null)
    setReport(null)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const result = await runEvalMatrix(GOLDEN_TASKS, configs, language, controller.signal)
      setReport(result)
    } catch (caught) {
      if (!isAbortError(caught)) {
        setError(getErrorMessage(caught, language))
      }
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
      }
      setIsRunning(false)
    }
  }

  const stop = () => abortRef.current?.abort()

  const bestScore = report
    ? Math.max(...report.byConfig.map((summary) => summary.avgScore))
    : 0

  return (
    <section className="page-stack harness-lab">
      <header className="page-header">
        <div>
          <h1>{isRu ? 'Harness Lab — evals' : 'Harness Lab — evals'}</h1>
          <p className="muted-text">
            {isRu
              ? 'Одни golden-задачи под разными связками «модель × политика». Сравниваем вклад harness и модели измеримо: средний балл, success-rate, токены.'
              : 'Same golden tasks under different model × policy configs. We measure the harness and model contribution: avg score, success rate, tokens.'}
          </p>
        </div>
      </header>

      <section className="card-section">
        <h2>{isRu ? 'Конфиги' : 'Configs'}</h2>
        <div className="lab-config-list">
          {allConfigs.map((config) => (
            <label key={config.id} className="checkbox">
              <input
                type="checkbox"
                checked={selected.has(config.id)}
                onChange={() => toggle(config.id)}
                disabled={isRunning}
              />
              <span>{config.label}</span>
            </label>
          ))}
        </div>

        <div className="inline-actions">
          <button
            type="button"
            className="button button--primary"
            onClick={() => void run()}
            disabled={isRunning || selected.size === 0}
          >
            {isRunning
              ? isRu
                ? 'Прогоняем…'
                : 'Running…'
              : isRu
                ? `Прогнать ${GOLDEN_TASKS.length} задач × ${selected.size}`
                : `Run ${GOLDEN_TASKS.length} tasks × ${selected.size}`}
          </button>
          {isRunning ? (
            <button type="button" className="button button--secondary" onClick={stop}>
              {isRu ? 'Остановить' : 'Stop'}
            </button>
          ) : null}
        </div>

        {error ? <p className="lab-error">{error}</p> : null}
      </section>

      {report ? (
        <section className="card-section">
          <h2>{isRu ? 'Сравнение конфигов' : 'Config comparison'}</h2>
          <table className="lab-table">
            <thead>
              <tr>
                <th>{isRu ? 'Конфиг' : 'Config'}</th>
                <th>{isRu ? 'Ср. балл' : 'Avg score'}</th>
                <th>{isRu ? 'Успех' : 'Success'}</th>
                <th>{isRu ? 'Ср. токены' : 'Avg tokens'}</th>
              </tr>
            </thead>
            <tbody>
              {report.byConfig.map((summary) => (
                <tr
                  key={summary.configId}
                  className={summary.avgScore === bestScore ? 'lab-table__row--best' : undefined}
                >
                  <td>{summary.label}</td>
                  <td>{summary.avgScore.toFixed(2)}</td>
                  <td>{Math.round(summary.successRate * 100)}%</td>
                  <td>{Math.round(summary.avgTokens)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <h2 className="lab-cells-heading">{isRu ? 'По ячейкам' : 'Per cell'}</h2>
          <table className="lab-table">
            <thead>
              <tr>
                <th>{isRu ? 'Задача' : 'Task'}</th>
                <th>{isRu ? 'Конфиг' : 'Config'}</th>
                <th>{isRu ? 'Балл' : 'Score'}</th>
                <th>{isRu ? 'Статус' : 'Status'}</th>
                <th>{isRu ? 'Токены' : 'Tokens'}</th>
                <th>{isRu ? 'Рефайны' : 'Refines'}</th>
                <th>{isRu ? 'Эскал.' : 'Escal.'}</th>
              </tr>
            </thead>
            <tbody>
              {report.cells.map((cell) => (
                <tr key={`${cell.configId}:${cell.taskId}`}>
                  <td>{cell.taskId}</td>
                  <td>{cell.configId}</td>
                  <td>{cell.score.toFixed(2)}</td>
                  <td>{cell.status}</td>
                  <td>{cell.tokens}</td>
                  <td>{cell.retries}</td>
                  <td>{cell.escalations}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </section>
  )
}
