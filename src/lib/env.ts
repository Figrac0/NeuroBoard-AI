const trimValue = (value?: string) => value?.trim() || undefined

export const env = {
  apiBaseUrl: trimValue(import.meta.env.VITE_API_URL),
  apiProxyTarget: trimValue(import.meta.env.VITE_API_PROXY_TARGET) || 'http://localhost:8080',
  ollamaUrl: trimValue(import.meta.env.VITE_OLLAMA_URL) || 'http://localhost:11434',
  ollamaModel: trimValue(import.meta.env.VITE_OLLAMA_MODEL) || 'llama3.1:8b',
  requestTimeoutMs: Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || '20000'),
}
