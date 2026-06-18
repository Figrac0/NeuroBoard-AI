// Golden-задачи для evals: «плохие» карточки, которые агент должен довести до ума.
// priceBand — ожидаемый разумный диапазон рыночной цены (для скоринга цены).

import { createEmptyParamValues } from '@/lib/item-config'
import type { ItemFormValues } from '@/types/items'

export interface EvalTask {
  readonly id: string
  readonly label: string
  readonly input: ItemFormValues
  readonly priceBand: { readonly min: number; readonly max: number }
}

function listing(values: Partial<ItemFormValues>): ItemFormValues {
  const { params, ...rest } = values
  return {
    category: 'electronics',
    title: '',
    price: '',
    description: '',
    ...rest,
    params: { ...createEmptyParamValues(), ...(params ?? {}) },
  }
}

export const GOLDEN_TASKS: readonly EvalTask[] = [
  {
    id: 'laptop-empty-desc',
    label: 'Ноутбук без описания',
    priceBand: { min: 45000, max: 95000 },
    input: listing({
      category: 'electronics',
      title: 'MacBook Air M2 13"',
      price: '70000',
      description: '',
      params: { type: 'laptop', brand: 'Apple', model: 'M2', condition: 'used', color: 'silver' },
    }),
  },
  {
    id: 'car-thin-desc',
    label: 'Авто со скудным описанием',
    priceBand: { min: 700000, max: 1300000 },
    input: listing({
      category: 'auto',
      title: 'Volkswagen Polo 2019',
      price: '950000',
      description: 'Продаю машину.',
      params: {
        brand: 'Volkswagen',
        model: 'Polo',
        yearOfManufacture: '2019',
        transmission: 'automatic',
        mileage: '85000',
        enginePower: '110',
      },
    }),
  },
  {
    id: 'flat-no-desc',
    label: 'Квартира без описания',
    priceBand: { min: 4500000, max: 9000000 },
    input: listing({
      category: 'real_estate',
      title: '2-комнатная квартира, 54 м²',
      price: '6500000',
      description: '',
      params: { type: 'flat', address: 'Самара, ул. Победы, 8', area: '54', floor: '7' },
    }),
  },
]
