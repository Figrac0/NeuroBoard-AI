// Дефолтные конфиги для Eval Lab: одни и те же golden-задачи под разными
// связками «модель × политика harness». Главные сравнения для демо:
//  - Sonnet+harness vs Sonnet naive  → вклад самого harness на одной модели;
//  - Ollama+harness vs Sonnet naive  → «открытая модель + harness ≈ фронтир naive».

import { env } from '@/lib/env'

import { createOllamaClient, createOpenAICompatClient } from '../model-client'
import { DEFAULT_POLICY, type RunnerPolicy } from '../runner'

import { type EvalConfig } from './matrix'

const NAIVE_POLICY: RunnerPolicy = {
  ...DEFAULT_POLICY,
  verify: false, // без верификации
  maxRetries: 0, // без ретраев
  maxRefines: 0, // без рефайнов
}

export function createDefaultEvalConfigs(): EvalConfig[] {
  const omniroute = (model: string) =>
    createOpenAICompatClient({ baseUrl: env.omnirouteUrl, model, apiKey: env.omnirouteApiKey })

  return [
    {
      id: 'sonnet-harness',
      label: 'Sonnet 4.5 + harness',
      client: omniroute('kr/claude-sonnet-4.5'),
      policy: DEFAULT_POLICY,
    },
    {
      id: 'sonnet-naive',
      label: 'Sonnet 4.5 (naive)',
      client: omniroute('kr/claude-sonnet-4.5'),
      policy: NAIVE_POLICY,
    },
    {
      id: 'haiku-harness',
      label: 'Haiku 4.5 + harness',
      client: omniroute('kr/claude-haiku-4.5'),
      policy: DEFAULT_POLICY,
    },
    {
      id: 'ollama-harness',
      label: `Ollama ${env.ollamaModel} + harness`,
      client: createOllamaClient({ url: env.ollamaUrl, model: env.ollamaModel }),
      policy: DEFAULT_POLICY,
    },
  ]
}
