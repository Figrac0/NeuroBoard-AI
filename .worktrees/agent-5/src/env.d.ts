/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_API_PROXY_TARGET?: string
  readonly VITE_OLLAMA_URL?: string
  readonly VITE_OLLAMA_MODEL?: string
  readonly VITE_REQUEST_TIMEOUT_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
