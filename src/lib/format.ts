import type { Language, PriceSuggestion } from '@/types/items'

function getLocale(language: Language) {
  return language === 'ru' ? 'ru-RU' : 'en-US'
}

export function formatPrice(value: number, language: Language = 'ru'): string {
  const formatter = new Intl.NumberFormat(getLocale(language), {
    maximumFractionDigits: 0,
  })

  return language === 'ru' ? `${formatter.format(value)} ₽` : `₽${formatter.format(value)}`
}

export function formatDateTime(value: string | undefined, language: Language = 'ru'): string {
  if (!value) {
    return language === 'ru' ? 'Не указано' : 'Not specified'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return language === 'ru' ? 'Не указано' : 'Not specified'
  }

  const formatter = new Intl.DateTimeFormat(getLocale(language), {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return formatter.format(date)
}

export function pluralizeAds(count: number, language: Language = 'ru'): string {
  if (language === 'en') {
    return count === 1 ? 'listing' : 'listings'
  }

  const remainder10 = count % 10
  const remainder100 = count % 100

  if (remainder10 === 1 && remainder100 !== 11) {
    return 'объявление'
  }

  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return 'объявления'
  }

  return 'объявлений'
}

export function getConfidenceLabel(
  confidence: PriceSuggestion['confidence'],
  language: Language = 'ru',
): string {
  if (language === 'en') {
    return confidence
  }

  if (confidence === 'high') {
    return 'высокая'
  }

  if (confidence === 'low') {
    return 'низкая'
  }

  return 'средняя'
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function getErrorMessage(error: unknown, language: Language = 'ru'): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return language === 'ru' ? 'Произошла непредвиденная ошибка.' : 'An unexpected error occurred.'
}
