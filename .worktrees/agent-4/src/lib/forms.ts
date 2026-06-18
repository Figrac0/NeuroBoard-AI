import { z } from 'zod'

import { ALL_PARAM_KEYS, createEmptyParamValues, getFieldConfig } from '@/lib/item-config'
import type {
  Category,
  Item,
  ItemFormValues,
  ItemUpdateInput,
  Language,
  ParamKey,
} from '@/types/items'

const categorySchema = z.enum(['auto', 'real_estate', 'electronics'])

export function createItemFormSchema(language: Language = 'ru') {
  const isRu = language === 'ru'

  return z.object({
    category: categorySchema,
    title: z
      .string()
      .trim()
      .min(1, isRu ? 'Название должно быть заполнено' : 'Title is required'),
    price: z
      .string()
      .trim()
      .min(1, isRu ? 'Цена должна быть заполнена' : 'Price is required')
      .refine(
        (value) => {
          const parsed = Number(value)
          return Number.isFinite(parsed) && parsed > 0
        },
        { message: isRu ? 'Цена должна быть больше нуля' : 'Price must be greater than zero' },
      ),
    description: z
      .string()
      .max(
        1000,
        isRu
          ? 'Описание не должно превышать 1000 символов'
          : 'Description must not exceed 1000 characters',
      ),
    params: z.record(z.string(), z.string()),
  })
}

export const EMPTY_FORM_VALUES: ItemFormValues = {
  category: 'electronics',
  title: '',
  price: '',
  description: '',
  params: createEmptyParamValues(),
}

export function sanitizeFormValues(values: Partial<ItemFormValues>): ItemFormValues {
  const sanitizedParams = createEmptyParamValues()
  const sourceParams = values.params ?? {}

  ALL_PARAM_KEYS.forEach((key) => {
    sanitizedParams[key] = sourceParams[key]?.toString() ?? ''
  })

  return {
    category: (values.category as Category) || 'electronics',
    title: values.title?.toString() ?? '',
    price: values.price?.toString() ?? '',
    description: values.description?.toString() ?? '',
    params: sanitizedParams,
  }
}

export function mapItemToFormValues(item: Item): ItemFormValues {
  const params = createEmptyParamValues()

  Object.entries(item.params).forEach(([key, value]) => {
    params[key as ParamKey] = value == null ? '' : String(value)
  })

  return {
    category: item.category,
    title: item.title,
    price: String(item.price),
    description: item.description,
    params,
  }
}

export function buildItemUpdateInput(values: ItemFormValues): ItemUpdateInput {
  const params = getFieldConfig(values.category).reduce<Record<string, string | number>>(
    (accumulator, field) => {
      const currentValue = values.params[field.key]?.trim()

      if (!currentValue) {
        return accumulator
      }

      accumulator[field.key] = field.type === 'number' ? Number(currentValue) : currentValue

      return accumulator
    },
    {},
  )

  return {
    category: values.category,
    title: values.title.trim(),
    description: values.description.trim() || undefined,
    price: Math.round(Number(values.price)),
    params: params as ItemUpdateInput['params'],
  }
}

export function getRevisionProbe(values: ItemFormValues) {
  const payload = buildItemUpdateInput(values)

  return {
    category: payload.category,
    description: payload.description,
    params: payload.params,
  }
}
