import { formatParamValue, getFieldConfig } from '@/lib/item-config'
import type { Category, Item, ItemParams, Language } from '@/types/items'

function isMissingValue(value: unknown): boolean {
  if (value == null) {
    return true
  }

  if (typeof value === 'string') {
    return value.trim() === ''
  }

  if (typeof value === 'number') {
    return Number.isNaN(value)
  }

  return false
}

export function getMissingFieldLabels(
  item: {
    category: Category
    description?: string
    params: ItemParams
  },
  language: Language = 'ru',
): string[] {
  const missingFields: string[] = []

  if (!item.description?.trim()) {
    missingFields.push(language === 'ru' ? 'Описание' : 'Description')
  }

  getFieldConfig(item.category, language).forEach((field) => {
    if (isMissingValue(item.params[field.key as keyof ItemParams])) {
      missingFields.push(field.label)
    }
  })

  return missingFields
}

export function getFilledCharacteristicEntries(
  item: Pick<Item, 'category' | 'params'>,
  language: Language = 'ru',
) {
  return getFieldConfig(item.category, language)
    .map((field) => {
      const value = item.params[field.key as keyof ItemParams]

      if (isMissingValue(value)) {
        return null
      }

      return {
        label: field.label,
        value: formatParamValue(item.category, field.key, value, language),
      }
    })
    .filter((entry): entry is { label: string; value: string } => entry !== null)
}

export function withRevisionMeta(
  item: Omit<Item, 'missingFields' | 'needsRevision'>,
  language: Language = 'ru',
): Item {
  const missingFields = getMissingFieldLabels(item, language)

  return {
    ...item,
    missingFields,
    needsRevision: missingFields.length > 0,
  }
}
