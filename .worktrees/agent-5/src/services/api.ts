import { env } from '@/lib/env'
import { useLanguageStore } from '@/stores/languageStore'

interface RequestOptions extends Omit<RequestInit, 'body'> {
  json?: unknown
  query?: Record<string, string | number | boolean | undefined>
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

function buildUrl(path: string, query?: RequestOptions['query']): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const basePath = env.apiBaseUrl ? `${env.apiBaseUrl}${normalizedPath}` : normalizedPath
  const url = new URL(basePath, window.location.origin)

  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value == null || value === '') {
      return
    }

    url.searchParams.set(key, String(value))
  })

  if (env.apiBaseUrl) {
    return url.toString()
  }

  return `${url.pathname}${url.search}`
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { json, headers, query, signal, ...restOptions } = options
  const response = await fetch(buildUrl(path, query), {
    ...restOptions,
    headers: {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    body: json ? JSON.stringify(json) : undefined,
    signal,
  })

  if (!response.ok) {
    let message =
      useLanguageStore.getState().language === 'ru'
        ? 'Не удалось выполнить запрос.'
        : 'Request failed.'

    try {
      const errorBody = (await response.json()) as { message?: string }
      message = errorBody.message || message
    } catch {
      // noop
    }

    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  const text = await response.text()

  if (!text) {
    return undefined as T
  }

  return JSON.parse(text) as T
}
