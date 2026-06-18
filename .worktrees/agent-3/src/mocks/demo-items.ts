import { withRevisionMeta } from '@/lib/revision'
import { readStorage, writeStorage } from '@/lib/storage'
import type { Item, ItemUpdateInput } from '@/types/items'

type DemoItemRecord = Omit<Item, 'missingFields' | 'needsRevision'>

const DEMO_ITEMS_STORAGE_KEY = 'avito-demo-items:v1'

const DEMO_ITEMS_SEED: DemoItemRecord[] = [
  {
    id: 'el-001',
    category: 'electronics',
    title: 'Наушники Soundcore Lite Air',
    description:
      'Надёжные беспроводные наушники белого цвета. Использовались аккуратно, хорошо держат заряд, кейс без трещин.',
    price: 2900,
    params: {
      type: 'misc',
      brand: 'Soundcore',
      model: 'Lite Air',
      condition: 'used',
      color: 'Белый',
    },
    createdAt: '2026-03-31T13:00:00.000Z',
    updatedAt: '2026-04-01T10:40:00.000Z',
    images: [],
  },
  {
    id: 'auto-001',
    category: 'auto',
    title: 'Volkswagen Polo',
    description: '',
    price: 1100000,
    params: {
      brand: 'Volkswagen',
      model: 'Polo',
      yearOfManufacture: 2020,
      transmission: 'automatic',
      mileage: 52000,
    },
    createdAt: '2026-03-27T09:30:00.000Z',
    images: [],
  },
  {
    id: 're-001',
    category: 'real_estate',
    title: 'Студия, 25м²',
    description: 'Светлая студия в современном доме. Подойдёт для проживания или сдачи в аренду.',
    price: 1500000,
    params: {
      type: 'flat',
      address: 'Самара, ул. Молодогвардейская, 15',
      area: 25,
      floor: 8,
    },
    createdAt: '2026-03-25T12:00:00.000Z',
    images: [],
  },
  {
    id: 're-002',
    category: 'real_estate',
    title: '1-кк, 44м²',
    description: '',
    price: 1900000,
    params: {
      type: 'flat',
      area: 44,
    },
    createdAt: '2026-03-24T11:10:00.000Z',
    images: [],
  },
  {
    id: 'el-002',
    category: 'electronics',
    title: 'MacBook Pro 16',
    description:
      'Ноутбук на M1 Pro, в хорошем состоянии. Подходит для монтажа, разработки и повседневной работы.',
    price: 64000,
    params: {
      type: 'laptop',
      brand: 'Apple',
      model: 'M1 Pro',
      condition: 'used',
      color: 'Серый',
    },
    createdAt: '2026-03-23T19:00:00.000Z',
    updatedAt: '2026-03-30T18:20:00.000Z',
    images: [],
  },
  {
    id: 'auto-002',
    category: 'auto',
    title: 'Mazda CX-5',
    description:
      'Надёжный кроссовер, обслужен, салон аккуратный. Отлично подойдёт для города и трассы.',
    price: 3120000,
    params: {
      brand: 'Mazda',
      model: 'CX-5',
      yearOfManufacture: 2023,
      transmission: 'automatic',
      mileage: 22000,
      enginePower: 194,
    },
    createdAt: '2026-03-21T10:00:00.000Z',
    images: [],
  },
  {
    id: 'el-003',
    category: 'electronics',
    title: 'iPad Air 11, 2024',
    description: 'Планшет в отличном состоянии, почти не использовался. Полный комплект.',
    price: 37000,
    params: {
      type: 'misc',
      brand: 'Apple',
      model: 'iPad Air 11',
      condition: 'used',
      color: 'Синий',
    },
    createdAt: '2026-03-20T08:15:00.000Z',
    images: [],
  },
  {
    id: 'auto-003',
    category: 'auto',
    title: 'Toyota Camry',
    description: '',
    price: 3900000,
    params: {
      brand: 'Toyota',
      model: 'Camry',
      yearOfManufacture: 2022,
      transmission: 'automatic',
      mileage: 18000,
      enginePower: 181,
    },
    createdAt: '2026-03-18T09:00:00.000Z',
    images: [],
  },
  {
    id: 'el-004',
    category: 'electronics',
    title: 'iPhone 17 Pro Max',
    description: 'Флагманский смартфон, состояние как новый. Полный комплект, без ремонтов.',
    price: 107000,
    params: {
      type: 'phone',
      brand: 'Apple',
      model: 'iPhone 17 Pro Max',
      condition: 'new',
      color: 'Чёрный',
    },
    createdAt: '2026-03-17T16:40:00.000Z',
    images: [],
  },
  {
    id: 're-003',
    category: 'real_estate',
    title: 'Комната, 18м²',
    description: 'Уютная комната в хорошем состоянии, рядом остановка и магазины.',
    price: 980000,
    params: {
      type: 'room',
      address: 'Тольятти, ул. Ленина, 42',
      area: 18,
      floor: 3,
    },
    createdAt: '2026-03-15T13:25:00.000Z',
    images: [],
  },
  {
    id: 'auto-004',
    category: 'auto',
    title: 'Omoda C5',
    description: 'Современный городской кроссовер, один владелец, сервисная история.',
    price: 2900000,
    params: {
      brand: 'Omoda',
      model: 'C5',
      yearOfManufacture: 2024,
      transmission: 'automatic',
      mileage: 7000,
      enginePower: 147,
    },
    createdAt: '2026-03-14T12:15:00.000Z',
    images: [],
  },
  {
    id: 'el-005',
    category: 'electronics',
    title: 'Samsung Galaxy Book',
    description: '',
    price: 54000,
    params: {
      type: 'laptop',
      brand: 'Samsung',
      model: 'Galaxy Book',
      color: 'Серебристый',
    },
    createdAt: '2026-03-12T17:50:00.000Z',
    images: [],
  },
]

function cloneRecord(item: DemoItemRecord): DemoItemRecord {
  return {
    ...item,
    params: { ...item.params },
    images: [...item.images],
  }
}

function readDemoRecords(): DemoItemRecord[] {
  const storedItems = readStorage<DemoItemRecord[]>(DEMO_ITEMS_STORAGE_KEY)

  if (Array.isArray(storedItems) && storedItems.length > 0) {
    return storedItems.map(cloneRecord)
  }

  return DEMO_ITEMS_SEED.map(cloneRecord)
}

function writeDemoRecords(items: DemoItemRecord[]) {
  writeStorage(DEMO_ITEMS_STORAGE_KEY, items.map(cloneRecord))
}

export function getDemoItems(): Item[] {
  return readDemoRecords().map((item) => withRevisionMeta(item))
}

export function getDemoItemsTotal(): number {
  return readDemoRecords().length
}

export function getDemoItemById(id: string): Item | undefined {
  const item = readDemoRecords().find((entry) => entry.id === id)
  return item ? withRevisionMeta(item) : undefined
}

export function updateDemoItem(id: string, payload: ItemUpdateInput): Item {
  const items = readDemoRecords()
  const index = items.findIndex((item) => item.id === id)

  if (index === -1) {
    throw new Error('Demo item not found')
  }

  const currentItem = items[index]
  const updatedItem: DemoItemRecord = {
    ...currentItem,
    category: payload.category,
    title: payload.title,
    description: payload.description ?? '',
    price: payload.price,
    params: { ...payload.params },
    updatedAt: new Date().toISOString(),
  }

  items[index] = updatedItem
  writeDemoRecords(items)

  return withRevisionMeta(updatedItem)
}
