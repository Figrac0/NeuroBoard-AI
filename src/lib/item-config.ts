import type { Category, FormParamValues, Language, ParamKey, SortOptionMeta } from '@/types/items'

interface LocalizedLabel {
  ru: string
  en: string
}

export interface ParamOption {
  value: string
  label: LocalizedLabel
}

interface RawParamFieldConfig {
  key: ParamKey
  label: LocalizedLabel
  type: 'text' | 'number' | 'select'
  placeholder?: LocalizedLabel
  options?: ParamOption[]
}

export interface ParamFieldConfig {
  key: ParamKey
  label: string
  type: 'text' | 'number' | 'select'
  placeholder?: string
  options?: { value: string; label: string }[]
}

const CATEGORY_LABELS: Record<Category, LocalizedLabel> = {
  auto: { ru: 'Авто', en: 'Cars' },
  real_estate: { ru: 'Недвижимость', en: 'Real Estate' },
  electronics: { ru: 'Электроника', en: 'Electronics' },
}

const SORT_OPTIONS: Record<Language, SortOptionMeta[]> = {
  ru: [
    { value: 'createdAt-desc', label: 'По новизне (сначала новые)' },
    { value: 'createdAt-asc', label: 'По новизне (сначала старые)' },
    { value: 'price-asc', label: 'По цене (сначала дешевле)' },
    { value: 'price-desc', label: 'По цене (сначала дороже)' },
    { value: 'title-asc', label: 'По названию (А - Я)' },
    { value: 'title-desc', label: 'По названию (Я - А)' },
  ],
  en: [
    { value: 'createdAt-desc', label: 'Newest first' },
    { value: 'createdAt-asc', label: 'Oldest first' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
    { value: 'title-asc', label: 'Title (A - Z)' },
    { value: 'title-desc', label: 'Title (Z - A)' },
  ],
}

export const ALL_PARAM_KEYS: ParamKey[] = [
  'brand',
  'model',
  'yearOfManufacture',
  'transmission',
  'mileage',
  'enginePower',
  'type',
  'address',
  'area',
  'floor',
  'condition',
  'color',
]

const CATEGORY_FIELDS: Record<Category, RawParamFieldConfig[]> = {
  auto: [
    {
      key: 'brand',
      label: { ru: 'Марка', en: 'Brand' },
      type: 'text',
      placeholder: { ru: 'Например, Volkswagen', en: 'For example, Volkswagen' },
    },
    {
      key: 'model',
      label: { ru: 'Модель', en: 'Model' },
      type: 'text',
      placeholder: { ru: 'Например, Polo', en: 'For example, Polo' },
    },
    {
      key: 'yearOfManufacture',
      label: { ru: 'Год выпуска', en: 'Year' },
      type: 'number',
      placeholder: { ru: 'Например, 2019', en: 'For example, 2019' },
    },
    {
      key: 'transmission',
      label: { ru: 'Коробка передач', en: 'Transmission' },
      type: 'select',
      options: [
        { value: 'automatic', label: { ru: 'Автомат', en: 'Automatic' } },
        { value: 'manual', label: { ru: 'Механика', en: 'Manual' } },
      ],
    },
    {
      key: 'mileage',
      label: { ru: 'Пробег, км', en: 'Mileage, km' },
      type: 'number',
      placeholder: { ru: 'Например, 85000', en: 'For example, 85000' },
    },
    {
      key: 'enginePower',
      label: { ru: 'Мощность двигателя, л.с.', en: 'Engine power, hp' },
      type: 'number',
      placeholder: { ru: 'Например, 110', en: 'For example, 110' },
    },
  ],
  real_estate: [
    {
      key: 'type',
      label: { ru: 'Тип объекта', en: 'Property type' },
      type: 'select',
      options: [
        { value: 'flat', label: { ru: 'Квартира', en: 'Flat' } },
        { value: 'house', label: { ru: 'Дом', en: 'House' } },
        { value: 'room', label: { ru: 'Комната', en: 'Room' } },
      ],
    },
    {
      key: 'address',
      label: { ru: 'Адрес', en: 'Address' },
      type: 'text',
      placeholder: {
        ru: 'Например, Самара, ул. Победы, 8',
        en: 'For example, 8 Pobedy St, Samara',
      },
    },
    {
      key: 'area',
      label: { ru: 'Площадь, м²', en: 'Area, m²' },
      type: 'number',
      placeholder: { ru: 'Например, 42', en: 'For example, 42' },
    },
    {
      key: 'floor',
      label: { ru: 'Этаж', en: 'Floor' },
      type: 'number',
      placeholder: { ru: 'Например, 7', en: 'For example, 7' },
    },
  ],
  electronics: [
    {
      key: 'type',
      label: { ru: 'Тип', en: 'Type' },
      type: 'select',
      options: [
        { value: 'phone', label: { ru: 'Телефон', en: 'Phone' } },
        { value: 'laptop', label: { ru: 'Ноутбук', en: 'Laptop' } },
        { value: 'misc', label: { ru: 'Другое', en: 'Miscellaneous' } },
      ],
    },
    {
      key: 'brand',
      label: { ru: 'Бренд', en: 'Brand' },
      type: 'text',
      placeholder: { ru: 'Например, Apple', en: 'For example, Apple' },
    },
    {
      key: 'model',
      label: { ru: 'Модель', en: 'Model' },
      type: 'text',
      placeholder: { ru: 'Например, M1 Pro', en: 'For example, M1 Pro' },
    },
    {
      key: 'condition',
      label: { ru: 'Состояние', en: 'Condition' },
      type: 'select',
      options: [
        { value: 'new', label: { ru: 'Новый', en: 'New' } },
        { value: 'used', label: { ru: 'Б/у', en: 'Used' } },
      ],
    },
    {
      key: 'color',
      label: { ru: 'Цвет', en: 'Color' },
      type: 'text',
      placeholder: { ru: 'Например, Серый', en: 'For example, Gray' },
    },
  ],
}

function localize(label: LocalizedLabel, language: Language): string {
  return label[language]
}

export function getCategoryOptions(language: Language = 'ru') {
  return [
    { value: 'electronics', label: getCategoryLabel('electronics', language) },
    { value: 'auto', label: getCategoryLabel('auto', language) },
    { value: 'real_estate', label: getCategoryLabel('real_estate', language) },
  ] satisfies { value: Category; label: string }[]
}

export function getSortOptions(language: Language = 'ru'): SortOptionMeta[] {
  return SORT_OPTIONS[language]
}

export function getCategoryLabel(category: Category, language: Language = 'ru'): string {
  return localize(CATEGORY_LABELS[category], language)
}

export function getFieldConfig(category: Category, language: Language = 'ru'): ParamFieldConfig[] {
  return CATEGORY_FIELDS[category].map((field) => ({
    key: field.key,
    label: localize(field.label, language),
    type: field.type,
    placeholder: field.placeholder ? localize(field.placeholder, language) : undefined,
    options: field.options?.map((option) => ({
      value: option.value,
      label: localize(option.label, language),
    })),
  }))
}

export function getOptionLabel(
  category: Category,
  key: ParamKey,
  value: unknown,
  language: Language = 'ru',
): string {
  const field = getFieldConfig(category, language).find((item) => item.key === key)

  if (!field || field.type !== 'select') {
    return String(value)
  }

  return field.options?.find((option) => option.value === value)?.label || String(value)
}

export function formatParamValue(
  category: Category,
  key: ParamKey,
  value: unknown,
  language: Language = 'ru',
): string {
  if (value == null || value === '') {
    return ''
  }

  const field = getFieldConfig(category, language).find((item) => item.key === key)

  if (!field) {
    return String(value)
  }

  if (field.type === 'select') {
    return getOptionLabel(category, key, value, language)
  }

  if (field.key === 'mileage') {
    return language === 'ru' ? `${value} км` : `${value} km`
  }

  if (field.key === 'enginePower') {
    return language === 'ru' ? `${value} л.с.` : `${value} hp`
  }

  if (field.key === 'area') {
    return `${value} m²`
  }

  return String(value)
}

export function createEmptyParamValues(): FormParamValues {
  return ALL_PARAM_KEYS.reduce<FormParamValues>((accumulator, key) => {
    accumulator[key] = ''
    return accumulator
  }, {})
}
