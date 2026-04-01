const trimValue = (value?: string) => value?.trim() || undefined
const parseBoolean = (value?: string, defaultValue = false) => {
  if (value == null) {
    return defaultValue
  }

  return value === 'true'
}

export const env = {
  apiBaseUrl: trimValue(import.meta.env.VITE_API_URL),
  apiProxyTarget: trimValue(import.meta.env.VITE_API_PROXY_TARGET) || 'http://localhost:8080',
  ollamaUrl: trimValue(import.meta.env.VITE_OLLAMA_URL) || 'http://localhost:11434',
  ollamaModel: trimValue(import.meta.env.VITE_OLLAMA_MODEL) || 'llama3.1:8b',
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || '20000'),
  forceDemoMode: parseBoolean(import.meta.env.VITE_FORCE_DEMO_MODE, false),
  enableDemoFallback: parseBoolean(import.meta.env.VITE_ENABLE_DEMO_FALLBACK, true),
}
