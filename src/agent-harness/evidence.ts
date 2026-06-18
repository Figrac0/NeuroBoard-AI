// Evidence log — единый журнал прогона агента.
// Каждая запись фиксирует три вещи: ЧТО сделал, ПОЧЕМУ, и каким был РЕЗУЛЬТАТ.
// Журнал пишется во время прогона (live через listener) и читается после (entries()).

export type EvidenceLevel = 'info' | 'success' | 'warning' | 'error'

export type EvidencePhase =
  | 'plan' // планировщик построил план
  | 'snapshot' // состояние сохранено перед действием
  | 'model-call' // обращение к модели
  | 'step' // шаг плана выполнен/завершился
  | 'verify' // проверка результата шага (feedback loop)
  | 'retry' // повторная попытка шага (рефайн по фидбеку)
  | 'escalate' // эскалация: сильная модель или needs-human
  | 'memory' // вспоминание/запись опыта прошлых прогонов
  | 'rollback' // откат к снимку

export interface TokenUsage {
  readonly prompt: number
  readonly completion: number
  readonly total: number
}

export interface EvidenceEntry {
  readonly id: string
  readonly at: number // Date.now()
  readonly phase: EvidencePhase
  readonly level: EvidenceLevel
  readonly stepId: string | null // к какому шагу плана относится (null — общесистемное)
  readonly action: string // ЧТО сделал
  readonly reason: string // ПОЧЕМУ
  readonly result: string // РЕЗУЛЬТАТ
  readonly tokens?: TokenUsage // если был вызов модели
  readonly durationMs?: number
  readonly attempt?: number // номер попытки (для retry)
}

// Черновик записи: id и at проставляет сам журнал.
export type EvidenceDraft = Omit<EvidenceEntry, 'id' | 'at'>

export type EvidenceListener = (entry: EvidenceEntry, all: readonly EvidenceEntry[]) => void

export interface EvidenceSink {
  append(draft: EvidenceDraft): EvidenceEntry
  entries(): readonly EvidenceEntry[]
}

export const EMPTY_TOKEN_USAGE: TokenUsage = { prompt: 0, completion: 0, total: 0 }

export function addTokens(left: TokenUsage, right: TokenUsage): TokenUsage {
  return {
    prompt: left.prompt + right.prompt,
    completion: left.completion + right.completion,
    total: left.total + right.total,
  }
}

// Создаёт журнал. listener получает свежую копию массива на каждую запись —
// это удобно для React: его можно напрямую отдать в setState.
export function createEvidenceLog(listener?: EvidenceListener): EvidenceSink {
  const log: EvidenceEntry[] = []

  return {
    append(draft) {
      const entry: EvidenceEntry = { ...draft, id: crypto.randomUUID(), at: Date.now() }
      log.push(entry)
      listener?.(entry, [...log])
      return entry
    },
    entries() {
      return [...log]
    },
  }
}
