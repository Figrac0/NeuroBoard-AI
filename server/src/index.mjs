import { createServer } from 'node:http'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { createSeedItems } from './seed-data.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data')
const DATA_FILE = join(DATA_DIR, 'items.json')
const IMAGE_DIR = join(__dirname, '..', 'images')
const PORT = Number(process.env.PORT || '8080')
const ITEM_IMAGE_MAP = {
  'el-001': ['/images/1.jpg', '/images/2.jpg', '/images/3.jpg'],
}

const categoryParamLabels = {
  auto: ['brand', 'model', 'yearOfManufacture', 'transmission', 'mileage', 'enginePower'],
  real_estate: ['type', 'address', 'area', 'floor'],
  electronics: ['type', 'brand', 'model', 'condition', 'color'],
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(JSON.stringify(payload, null, 2))
}

function sendBinary(response, statusCode, payload, contentType) {
  response.writeHead(statusCode, {
    'Content-Type': contentType,
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end(payload)
}

function sendEmpty(response, statusCode) {
  response.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,PUT,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  response.end()
}

async function ensureDataFile() {
  await mkdir(DATA_DIR, { recursive: true })

  if (!existsSync(DATA_FILE)) {
    await writeFile(DATA_FILE, JSON.stringify(createSeedItems(), null, 2), 'utf8')
  }
}

async function readItems() {
  await ensureDataFile()
  const raw = await readFile(DATA_FILE, 'utf8')
  const items = JSON.parse(raw)

  if (!Array.isArray(items) || items.some((item) => !item.category)) {
    const seededItems = createSeedItems().map((item) => ({
      ...item,
      images: ITEM_IMAGE_MAP[item.id] ?? item.images ?? [],
    }))
    await writeItems(seededItems)
    return seededItems
  }

  let changed = false
  const decoratedItems = items.map((item) => {
    const mappedImages = ITEM_IMAGE_MAP[item.id]

    if (!mappedImages || (Array.isArray(item.images) && item.images.length > 0)) {
      return item
    }

    changed = true
    return {
      ...item,
      images: mappedImages,
    }
  })

  if (changed) {
    await writeItems(decoratedItems)
  }

  return decoratedItems
}

async function writeItems(items) {
  await writeFile(DATA_FILE, JSON.stringify(items, null, 2), 'utf8')
}

function isMissing(value) {
  return value === undefined || value === null || value === ''
}

function needsRevision(item) {
  if (!item.description?.trim()) {
    return true
  }

  return categoryParamLabels[item.category].some((key) => isMissing(item.params?.[key]))
}

function withRevision(item) {
  return {
    ...item,
    needsRevision: needsRevision(item),
  }
}

function normalizeText(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
}

function sortItems(items, sortColumn, sortDirection) {
  const factor = sortDirection === 'asc' ? 1 : -1

  return [...items].sort((left, right) => {
    if (sortColumn === 'title') {
      return left.title.localeCompare(right.title, 'ru') * factor
    }

    if (sortColumn === 'price') {
      return (left.price - right.price) * factor
    }

    const leftDate = new Date(left.createdAt || 0).getTime()
    const rightDate = new Date(right.createdAt || 0).getTime()
    return (leftDate - rightDate) * factor
  })
}

function parseBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = []

    request.on('data', (chunk) => {
      chunks.push(chunk)
    })

    request.on('end', () => {
      try {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve(raw ? JSON.parse(raw) : {})
      } catch (error) {
        reject(error)
      }
    })

    request.on('error', reject)
  })
}

function validateItemUpdate(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Тело запроса должно быть объектом.'
  }

  if (!['auto', 'real_estate', 'electronics'].includes(payload.category)) {
    return 'Поле category должно быть одним из: auto, real_estate, electronics.'
  }

  if (!payload.title || typeof payload.title !== 'string') {
    return 'Поле title обязательно.'
  }

  if (!Number.isFinite(Number(payload.price))) {
    return 'Поле price должно быть числом.'
  }

  if (!payload.params || typeof payload.params !== 'object') {
    return 'Поле params обязательно.'
  }

  return null
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    sendJson(response, 400, { message: 'Некорректный запрос.' })
    return
  }

  if (request.method === 'OPTIONS') {
    sendEmpty(response, 204)
    return
  }

  const url = new URL(request.url, `http://localhost:${PORT}`)
  const path = url.pathname

  try {
    if (request.method === 'GET' && path.startsWith('/images/')) {
      const imageName = path.split('/').pop()

      if (!imageName || !/^[a-zA-Z0-9_.-]+$/.test(imageName)) {
        sendJson(response, 400, { message: 'Некорректное имя файла.' })
        return
      }

      const filePath = join(IMAGE_DIR, imageName)
      const fileBuffer = await readFile(filePath)
      const extension = imageName.split('.').pop()?.toLowerCase()
      const contentType =
        extension === 'png' ? 'image/png' : extension === 'webp' ? 'image/webp' : 'image/jpeg'

      sendBinary(response, 200, fileBuffer, contentType)
      return
    }

    if (request.method === 'GET' && path === '/items') {
      const items = await readItems()
      const q = normalizeText(url.searchParams.get('q'))
      const categories = url.searchParams.get('categories')?.split(',').filter(Boolean) || []
      const needsRevisionOnly = url.searchParams.get('needsRevision') === 'true'
      const limit = Number(url.searchParams.get('limit') || '50')
      const skip = Number(url.searchParams.get('skip') || '0')
      const sortColumn = url.searchParams.get('sortColumn') || 'createdAt'
      const sortDirection = url.searchParams.get('sortDirection') || 'desc'

      let preparedItems = items.map(withRevision)

      if (q) {
        preparedItems = preparedItems.filter((item) => normalizeText(item.title).includes(q))
      }

      if (categories.length) {
        preparedItems = preparedItems.filter((item) => categories.includes(item.category))
      }

      if (needsRevisionOnly) {
        preparedItems = preparedItems.filter((item) => item.needsRevision)
      }

      preparedItems = sortItems(preparedItems, sortColumn, sortDirection)

      const total = preparedItems.length
      const pagedItems = preparedItems.slice(skip, skip + limit)

      sendJson(response, 200, {
        items: pagedItems,
        total,
      })
      return
    }

    if (request.method === 'GET' && path.startsWith('/items/')) {
      const id = path.split('/').pop()
      const items = await readItems()
      const item = items.find((entry) => entry.id === id)

      if (!item) {
        sendJson(response, 404, { message: 'Объявление не найдено.' })
        return
      }

      sendJson(response, 200, { item: withRevision(item) })
      return
    }

    if (request.method === 'PUT' && path.startsWith('/items/')) {
      const id = path.split('/').pop()
      const body = await parseBody(request)
      const validationError = validateItemUpdate(body)

      if (validationError) {
        sendJson(response, 400, { message: validationError })
        return
      }

      const items = await readItems()
      const index = items.findIndex((entry) => entry.id === id)

      if (index === -1) {
        sendJson(response, 404, { message: 'Объявление не найдено.' })
        return
      }

      const currentItem = items[index]
      const nextItem = {
        ...currentItem,
        category: body.category,
        title: body.title.trim(),
        description: typeof body.description === 'string' ? body.description.trim() : '',
        price: Number(body.price),
        params: body.params,
        updatedAt: new Date().toISOString(),
      }

      items[index] = nextItem
      await writeItems(items)

      sendJson(response, 200, { item: withRevision(nextItem) })
      return
    }

    sendJson(response, 404, { message: 'Маршрут не найден.' })
  } catch (error) {
    sendJson(response, 500, {
      message: error instanceof Error ? error.message : 'Внутренняя ошибка сервера.',
    })
  }
})

server.listen(PORT, () => {
  console.log(`Mock backend listening on http://localhost:${PORT}`)
})
