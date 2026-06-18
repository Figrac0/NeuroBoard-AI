// Сборка ModelClient из переменных окружения.
// По умолчанию демо нацелено на OmniRoute (Claude Sonnet 4.5),
// а Ollama остаётся офлайн-страховкой через resilient-обёртку.

import { env } from '@/lib/env'

import {
  createOllamaClient,
  createOpenAICompatClient,
  createResilientModelClient,
  type ModelClient,
} from './model-client'

export function createConfiguredModelClient(onFallback?: (error: unknown) => void): ModelClient {
  const ollama = createOllamaClient({ url: env.ollamaUrl, model: env.ollamaModel })

  if (env.modelProvider === 'ollama') {
    return ollama
  }

  const omniroute = createOpenAICompatClient({
    baseUrl: env.omnirouteUrl,
    model: env.omnirouteModel,
    apiKey: env.omnirouteApiKey,
  })

  // Шлюз — основной путь, Ollama — офлайн-фолбэк.
  return createResilientModelClient(omniroute, ollama, onFallback)
}
