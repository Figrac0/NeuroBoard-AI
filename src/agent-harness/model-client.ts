// Сменный транспорт к модели. Harness не знает, куда реально идёт запрос —
// он работает с интерфейсом ModelClient. Это даёт провайдер-агностичность:
//  - Ollama (/api/generate) — полностью офлайн, как в исходном ТЗ;
//  - OpenAI-совместимый шлюз (OmniRoute /v1/chat/completions) — Claude Sonnet и др.
// Оба адаптера нормализуют разные ответы провайдеров к одному TokenUsage.

import { type TokenUsage } from './evidence'

export interface ModelMessage {
  readonly role: 'system' | 'user' | 'assistant'
  readonly content: string
}

export interface ModelRequest {
  readonly messages: readonly ModelMessage[]
  readonly temperature?: number
  readonly signal?: AbortSignal
}

export interface ModelResponse {
  readonly text: string
  readonly tokens: TokenUsage // нормализовано из ответа любого провайдера
}

export type ModelProviderId = 'ollama' | 'omniroute'

export interface ModelClient {
  readonly id: ModelProviderId // куда реально ходили — попадает в evidence
  readonly model: string // 'kr/claude-sonnet-4.5' | 'llama3.1:8b'
  complete(request: ModelRequest): Promise<ModelResponse>
}

const DEFAULT_TEMPERATURE = 0.35

function messagesToPrompt(messages: readonly ModelMessage[]): string {
  return messages.map((message) => message.content).join('\n\n')
}

// --- Ollama (/api/generate) ------------------------------------------------

interface OllamaGenerateResponse {
  response?: string
  prompt_eval_count?: number
  eval_count?: number
}

export function createOllamaClient(config: { url: string; model: string }): ModelClient {
  return {
    id: 'ollama',
    model: config.model,
    async complete(request) {
      const response = await fetch(`${config.url}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: config.model,
          stream: false,
          prompt: messagesToPrompt(request.messages),
          options: { temperature: request.temperature ?? DEFAULT_TEMPERATURE },
        }),
        signal: request.signal,
      })

      if (!response.ok) {
        throw new Error(`Ollama request failed with status ${response.status}`)
      }

      const payload = (await response.json()) as OllamaGenerateResponse
      const text = payload.response?.trim() ?? ''

      if (!text) {
        throw new Error('Ollama returned an empty response')
      }

      const prompt = payload.prompt_eval_count ?? 0
      const completion = payload.eval_count ?? 0

      return { text, tokens: { prompt, completion, total: prompt + completion } }
    },
  }
}

// --- OpenAI-совместимый шлюз (/v1/chat/completions) ------------------------

interface OpenAIChatResponse {
  choices?: { message?: { content?: string } }[]
  usage?: {
    prompt_tokens?: number
    completion_tokens?: number
    total_tokens?: number
  }
}

export function createOpenAICompatClient(config: {
  baseUrl: string
  model: string
  apiKey?: string
}): ModelClient {
  return {
    id: 'omniroute',
    model: config.model,
    async complete(request) {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }

      if (config.apiKey) {
        headers.Authorization = `Bearer ${config.apiKey}`
      }

      const response = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: config.model,
          stream: false,
          temperature: request.temperature ?? DEFAULT_TEMPERATURE,
          messages: request.messages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
        signal: request.signal,
      })

      if (!response.ok) {
        throw new Error(`OmniRoute request failed with status ${response.status}`)
      }

      const payload = (await response.json()) as OpenAIChatResponse
      const text = payload.choices?.[0]?.message?.content?.trim() ?? ''

      if (!text) {
        throw new Error('OmniRoute returned an empty response')
      }

      const prompt = payload.usage?.prompt_tokens ?? 0
      const completion = payload.usage?.completion_tokens ?? 0
      const total = payload.usage?.total_tokens ?? prompt + completion

      return { text, tokens: { prompt, completion, total } }
    },
  }
}

// --- Resilient: primary -> fallback ---------------------------------------
// Если основной провайдер недоступен (шлюз лёг, нет сети) — прозрачно
// переключаемся на запасной. На отмену пользователем fallback не срабатывает.
export function createResilientModelClient(
  primary: ModelClient,
  fallback: ModelClient,
  onFallback?: (error: unknown) => void,
): ModelClient {
  return {
    id: primary.id,
    model: primary.model,
    async complete(request) {
      try {
        return await primary.complete(request)
      } catch (error) {
        if (request.signal?.aborted) {
          throw error
        }

        onFallback?.(error)
        return fallback.complete(request)
      }
    },
  }
}
