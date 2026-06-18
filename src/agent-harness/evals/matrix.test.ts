import { describe, expect, it } from 'vitest'

import { type ModelClient } from '../model-client'
import { DEFAULT_POLICY } from '../runner'

import { runEvalMatrix, type EvalConfig } from './matrix'
import { GOLDEN_TASKS } from './tasks'

// Фейковый клиент: на price-промпт отдаёт JSON с ценой, иначе — текст описания.
function makeEvalClient(description: string, price: number): ModelClient {
  return {
    id: 'ollama',
    model: 'fake',
    async complete(request) {
      const prompt = request.messages.map((message) => message.content).join('\n')
      const text = /suggestedPrice/.test(prompt)
        ? JSON.stringify({ suggestedPrice: price, confidence: 'medium', reasoning: 'test' })
        : description
      return { text, tokens: { prompt: 5, completion: 5, total: 10 } }
    },
  }
}

describe('runEvalMatrix', () => {
  it('produces a cell per task/config and ranks the better model higher', async () => {
    const tasks = GOLDEN_TASKS.slice(0, 2)
    const configs: EvalConfig[] = [
      {
        id: 'strong',
        label: 'strong model',
        client: makeEvalClient('g'.repeat(220), 70000),
        policy: DEFAULT_POLICY,
      },
      {
        id: 'weak',
        label: 'weak model',
        client: makeEvalClient('short', 70000),
        policy: DEFAULT_POLICY,
      },
    ]

    const report = await runEvalMatrix(tasks, configs, 'en')

    expect(report.cells).toHaveLength(tasks.length * configs.length)
    expect(report.byConfig).toHaveLength(2)

    const strong = report.byConfig.find((summary) => summary.configId === 'strong')
    const weak = report.byConfig.find((summary) => summary.configId === 'weak')

    expect(strong).toBeDefined()
    expect(weak).toBeDefined()
    if (strong && weak) {
      expect(strong.avgScore).toBeGreaterThan(weak.avgScore)
    }
  })
})
