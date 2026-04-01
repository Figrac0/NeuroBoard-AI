export type Category = 'auto' | 'real_estate' | 'electronics'
export type AdsLayout = 'grid' | 'list'
export type Language = 'ru' | 'en'
export type SortOption =
  | 'createdAt-desc'
  | 'createdAt-asc'
  | 'price-asc'
  | 'price-desc'
  | 'title-asc'
  | 'title-desc'

export type Transmission = 'automatic' | 'manual'
export type RealEstateType = 'flat' | 'house' | 'room'
export type ElectronicsType = 'phone' | 'laptop' | 'misc'
export type ElectronicsCondition = 'new' | 'used'

export interface AutoItemParams {
  brand?: string
  model?: string
  yearOfManufacture?: number
  transmission?: Transmission
  mileage?: number
  enginePower?: number
}

export interface RealEstateItemParams {
  type?: RealEstateType
  address?: string
  area?: number
  floor?: number
}

export interface ElectronicsItemParams {
  type?: ElectronicsType
  brand?: string
  model?: string
  condition?: ElectronicsCondition
  color?: string
}

export interface ItemParamsMap {
  auto: AutoItemParams
  real_estate: RealEstateItemParams
  electronics: ElectronicsItemParams
}

export type ItemParams = ItemParamsMap[Category]

export type ParamKey =
  | 'brand'
  | 'model'
  | 'yearOfManufacture'
  | 'transmission'
  | 'mileage'
  | 'enginePower'
  | 'type'
  | 'address'
  | 'area'
  | 'floor'
  | 'condition'
  | 'color'

export type FormParamValues = Partial<Record<ParamKey, string>>

export interface Item {
  id: string
  category: Category
  title: string
  description: string
  price: number
  params: ItemParams
  createdAt?: string
  updatedAt?: string
  images: string[]
  needsRevision: boolean
  missingFields: string[]
}

export interface ItemFormValues {
  category: Category
  title: string
  price: string
  description: string
  params: FormParamValues
}

export interface ItemUpdateInput {
  category: Category
  title: string
  description?: string
  price: number
  params: ItemParams
}

export interface DescriptionSuggestion {
  text: string
  summary?: string
}

export interface PriceSuggestion {
  suggestedPrice: number
  minPrice?: number
  maxPrice?: number
  confidence: 'low' | 'medium' | 'high'
  reasoning: string
}

export interface SortOptionMeta {
  value: SortOption
  label: string
}

export interface AdChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}
