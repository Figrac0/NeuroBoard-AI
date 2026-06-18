import { describe, expect, it } from 'vitest'

import { getFilledCharacteristicEntries, getMissingFieldLabels } from '@/lib/revision'
import type { Item } from '@/types/items'

describe('revision helpers', () => {
  it('detects missing description and characteristics', () => {
    const missing = getMissingFieldLabels({
      category: 'electronics',
      description: '',
      params: {
        brand: 'Apple',
        model: 'MacBook Pro 16',
      },
    })

    expect(missing).toEqual(['Описание', 'Тип', 'Состояние', 'Цвет'])
  })

  it('returns only filled characteristics for details page', () => {
    const item: Pick<Item, 'category' | 'params'> = {
      category: 'auto',
      params: {
        brand: 'Volkswagen',
        model: 'Polo',
        yearOfManufacture: 2018,
        mileage: 86000,
      },
    }

    expect(getFilledCharacteristicEntries(item)).toEqual([
      { label: 'Марка', value: 'Volkswagen' },
      { label: 'Модель', value: 'Polo' },
      { label: 'Год выпуска', value: '2018' },
      { label: 'Пробег, км', value: '86000 км' },
    ])
  })
})
