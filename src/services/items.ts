import { z } from 'zod'

import { withRevisionMeta } from '@/lib/revision'
import { apiRequest } from '@/services/api'
import type {
  AutoItemParams,
  Category,
  ElectronicsItemParams,
  Item,
  ItemParams,
  ItemUpdateInput,
  RealEstateItemParams,
} from '@/types/items'

const categorySchema = z.enum(['auto', 'real_estate', 'electronics'])

const optionalStringSchema = z.preprocess((value) => {
  if (value == null) {
    return undefined
  }

  if (typeof value !== 'string') {
    return value
  }

  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}, z.string().optional())

const optionalNumberSchema = z.preprocess((value) => {
  if (value == null || value === '') {
    return undefined
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}, z.number().optional())

const autoParamsSchema = z.object({
  brand: optionalStringSchema,
  model: optionalStringSchema,
  yearOfManufacture: optionalNumberSchema,
  transmission: z.enum(['automatic', 'manual']).optional(),
  mileage: optionalNumberSchema,
  enginePower: optionalNumberSchema,
})

const realEstateParamsSchema = z.object({
  type: z.enum(['flat', 'house', 'room']).optional(),
  address: optionalStringSchema,
  area: optionalNumberSchema,
  floor: optionalNumberSchema,
})

const electronicsParamsSchema = z.object({
  type: z.enum(['phone', 'laptop', 'misc']).optional(),
  brand: optionalStringSchema,
  model: optionalStringSchema,
  condition: z.enum(['new', 'used']).optional(),
  color: optionalStringSchema,
})

const rawItemSchema = z.object({
  id: z.union([z.string(), z.number()]).transform(String),
  category: categorySchema,
  title: z.string(),
  description: z
    .string()
    .nullish()
    .transform((value) => value ?? ''),
  price: z.coerce.number(),
  params: z
    .record(z.string(), z.unknown())
    .nullish()
    .transform((value) => value ?? {}),
  createdAt: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  updatedAt: z
    .string()
    .nullish()
    .transform((value) => value ?? undefined),
  images: z.array(z.string()).nullish(),
  image: z.string().nullish(),
  photo: z.string().nullish(),
})

const listResponseSchema = z.object({
  items: z.array(rawItemSchema).default([]),
  total: z.coerce.number().default(0),
})

const detailResponseSchema = z.union([
  rawItemSchema,
  z.object({ item: rawItemSchema }),
  z.object({ items: z.array(rawItemSchema).min(1) }),
])

function normalizeParams(category: Category, params: Record<string, unknown>): ItemParams {
  switch (category) {
    case 'auto':
      return autoParamsSchema.parse(params) as AutoItemParams
    case 'real_estate':
      return realEstateParamsSchema.parse(params) as RealEstateItemParams
    case 'electronics':
      return electronicsParamsSchema.parse(params) as ElectronicsItemParams
  }
}

function normalizeItem(rawItem: z.infer<typeof rawItemSchema>): Item {
  const images = [rawItem.image, rawItem.photo, ...(rawItem.images ?? [])].filter(
    (value): value is string => Boolean(value),
  )

  return withRevisionMeta({
    id: rawItem.id,
    category: rawItem.category,
    title: rawItem.title,
    description: rawItem.description,
    price: rawItem.price,
    params: normalizeParams(rawItem.category, rawItem.params),
    createdAt: rawItem.createdAt,
    updatedAt: rawItem.updatedAt,
    images,
  })
}

export async function getAllItems(
  filters: {
    query?: string
    categories?: Category[]
  },
  signal?: AbortSignal,
): Promise<Item[]> {
  const items: Item[] = []
  const pageSize = 50
  let skip = 0
  let total = Number.POSITIVE_INFINITY

  while (items.length < total) {
    const response = await apiRequest<unknown>('/items', {
      signal,
      query: {
        q: filters.query || undefined,
        categories: filters.categories?.length ? filters.categories.join(',') : undefined,
        limit: pageSize,
        skip,
      },
    })
    const parsed = listResponseSchema.parse(response)
    total = parsed.total
    items.push(...parsed.items.map(normalizeItem))

    if (parsed.items.length < pageSize) {
      break
    }

    skip += pageSize
  }

  return items
}

export async function getItemsTotal(signal?: AbortSignal): Promise<number> {
  const response = await apiRequest<unknown>('/items', {
    signal,
    query: {
      limit: 1,
      skip: 0,
    },
  })

  return listResponseSchema.parse(response).total
}

export async function getItemById(id: string, signal?: AbortSignal): Promise<Item> {
  const response = await apiRequest<unknown>(`/items/${id}`, { signal })
  const parsed = detailResponseSchema.parse(response)

  if ('item' in parsed) {
    return normalizeItem(parsed.item)
  }

  if ('items' in parsed) {
    return normalizeItem(parsed.items[0])
  }

  return normalizeItem(parsed)
}

export async function updateItem(
  id: string,
  payload: ItemUpdateInput,
  signal?: AbortSignal,
): Promise<Item | undefined> {
  const response = await apiRequest<unknown>(`/items/${id}`, {
    method: 'PUT',
    json: payload,
    signal,
  })

  if (!response) {
    return undefined
  }

  const parsed = detailResponseSchema.safeParse(response)
  if (!parsed.success) {
    return undefined
  }

  if ('item' in parsed.data) {
    return normalizeItem(parsed.data.item)
  }

  if ('items' in parsed.data) {
    return normalizeItem(parsed.data.items[0])
  }

  return normalizeItem(parsed.data)
}
