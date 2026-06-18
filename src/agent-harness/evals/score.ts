// Детерминированный скорер карточки после прогона агента.
// Меряет ровно то, на что агент влияет: качество описания и адекватность цены.
// Без LLM-judge — чтобы сравнение конфигов/моделей было воспроизводимым.

import type { ItemFormValues, Language } from '@/types/items'

import type { EvalTask } from './tasks'

export interface ListingScore {
  readonly total: number // 0..1
  readonly description: number // 0..1
  readonly price: number // 0..1
  readonly notes: string[]
}

const DESCRIPTION_TARGET = 200
const DESCRIPTION_MAX = 1000

export function scoreListing(
  values: ItemFormValues,
  task: EvalTask,
  language: Language = 'ru',
): ListingScore {
  const isRu = language === 'ru'
  const notes: string[] = []

  const length = values.description.trim().length
  let description: number

  if (length === 0) {
    description = 0
    notes.push(isRu ? 'Описание пустое' : 'Empty description')
  } else if (length > DESCRIPTION_MAX) {
    description = 0.5
    notes.push(isRu ? 'Описание превышает лимит' : 'Description over the limit')
  } else {
    description = Math.min(1, length / DESCRIPTION_TARGET)
  }

  const price = Number(values.price)
  let priceScore: number

  if (!Number.isFinite(price) || price <= 0) {
    priceScore = 0
    notes.push(isRu ? 'Цена некорректна' : 'Invalid price')
  } else if (price >= task.priceBand.min && price <= task.priceBand.max) {
    priceScore = 1
  } else {
    const nearest = price < task.priceBand.min ? task.priceBand.min : task.priceBand.max
    const ratio = Math.min(price, nearest) / Math.max(price, nearest)
    priceScore = Math.max(0, Math.min(0.7, ratio))
    notes.push(isRu ? 'Цена вне ожидаемого диапазона' : 'Price outside expected band')
  }

  return {
    total: 0.5 * description + 0.5 * priceScore,
    description,
    price: priceScore,
    notes,
  }
}
