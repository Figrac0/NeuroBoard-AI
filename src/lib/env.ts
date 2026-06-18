const trimValue = (value?: string) => value?.trim() || undefined
const parseBoolean = (value?: string, defaultValue = false) => {
  if (value == null) {
    return defaultValue
  }

  return value === 'true'
}

type ModelProvider = 'ollama' | 'omniroute'

const parseModelProvider = (value?: string): ModelProvider =>
  trimValue(value) === 'ollama' ? 'ollama' : 'omniroute'

type MemoryBackend = 'local' | 'zep'

const parseMemoryBackend = (value?: string): MemoryBackend =>
  trimValue(value) === 'zep' ? 'zep' : 'local'

export const env = {
  apiBaseUrl: trimValue(import.meta.env.VITE_API_URL),
  apiProxyTarget: trimValue(import.meta.env.VITE_API_PROXY_TARGET) || 'http://localhost:8080',
  ollamaUrl: trimValue(import.meta.env.VITE_OLLAMA_URL) || 'http://localhost:11434',
  ollamaModel: trimValue(import.meta.env.VITE_OLLAMA_MODEL) || 'qwen3:8b',
  // Провайдер модели для harness: 'omniroute' (по умолчанию) или 'ollama'.
  modelProvider: parseModelProvider(import.meta.env.VITE_MODEL_PROVIDER),
  omnirouteUrl: trimValue(import.meta.env.VITE_OMNIROUTE_URL) || 'http://localhost:20128/v1',
  omnirouteModel: trimValue(import.meta.env.VITE_OMNIROUTE_MODEL) || 'kr/claude-sonnet-4.5',
  omnirouteApiKey: trimValue(import.meta.env.VITE_OMNIROUTE_API_KEY),
  memoryBackend: parseMemoryBackend(import.meta.env.VITE_MEMORY_BACKEND),
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || '20000'),
  forceDemoMode: parseBoolean(import.meta.env.VITE_FORCE_DEMO_MODE, false),
  enableDemoFallback: parseBoolean(import.meta.env.VITE_ENABLE_DEMO_FALLBACK, true),
}
