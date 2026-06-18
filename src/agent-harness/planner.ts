// Plan mode — цель превращается в упорядоченный список шагов.
// Две реализации за одним интерфейсом Planner:
//  - createLlmPlanner: модель сама строит план (основной путь, сильная модель);
//  - createRuleBasedPlanner: детерминированные правила по состоянию формы (фолбэк).
// createDefaultPlanner композирует их: LLM с откатом на правила (graceful degradation).

import { getFieldConfig } from '@/lib/item-config'
import type { ItemFormValues, Language } from '@/types/items'

import { type ModelClient } from './model-client'

// Возможности агента в этом домене. Список-источник + производный union:
// tsconfig включает erasableSyntaxOnly, поэтому рантайм-enum недопустим.
export const CAPABILITY_KINDS = [
  'suggest-category',
  'fill-attributes',
  'improve-title',
  'improve-description',
  'estimate-price',
] as const

export type CapabilityKind = (typeof CAPABILITY_KINDS)[number]

export type AgentGoal = 'improve-listing'

export type PlanStepStatus = 'pending' | 'running' | 'done' | 'failed' | 'skipped'

export type PlanSource = 'llm' | 'rules'

export interface PlanStep {
  readonly id: string
  readonly kind: CapabilityKind
  readonly title: string // человекочитаемо для UI
  readonly reason: string // почему шаг попал в план
  readonly status: PlanStepStatus
}

export interface Plan {
  readonly id: string
  readonly goal: AgentGoal
  readonly steps: readonly PlanStep[]
  readonly createdAt: number
  readonly source: PlanSource // кто построил план — для evidence/UI
}

export interface PlanContext {
  readonly values: ItemFormValues
  readonly language: Language
  readonly missingFields: readonly string[]
}

export interface Planner {
  plan(goal: AgentGoal, context: PlanContext, signal?: AbortSignal): Promise<Plan>
}

const CAPABILITY_TITLES: Record<CapabilityKind, Record<Language, string>> = {
  'suggest-category': { ru: 'Определить категорию', en: 'Classify category' },
  'fill-attributes': { ru: 'Заполнить характеристики', en: 'Fill attributes' },
  'improve-title': { ru: 'Улучшить заголовок', en: 'Improve the title' },
  'improve-description': { ru: 'Улучшить описание', en: 'Improve the description' },
  'estimate-price': { ru: 'Оценить рыночную цену', en: 'Estimate market price' },
}

function isCapabilityKind(value: unknown): value is CapabilityKind {
  return typeof value === 'string' && (CAPABILITY_KINDS as readonly string[]).includes(value)
}

function makeStep(kind: CapabilityKind, reason: string, language: Language): PlanStep {
  return {
    id: crypto.randomUUID(),
    kind,
    title: CAPABILITY_TITLES[kind][language],
    reason,
    status: 'pending',
  }
}

// --- Детерминированный планировщик ----------------------------------------

export function createRuleBasedPlanner(): Planner {
  return {
    async plan(goal, context) {
      const isRu = context.language === 'ru'
      const steps: PlanStep[] = []
      const { language, values } = context
      const description = values.description.trim()
      const title = values.title.trim()
      const missingParams = getFieldConfig(values.category, language).filter(
        (field) => !values.params[field.key]?.trim(),
      )

      // Порядок важен: сначала факты (характеристики), затем тексты и цена.
      if (missingParams.length > 0) {
        steps.push(
          makeStep(
            'fill-attributes',
            isRu
              ? `Не заполнены характеристики: ${missingParams.map((field) => field.label).join(', ')}.`
              : `Missing attributes: ${missingParams.map((field) => field.label).join(', ')}.`,
            language,
          ),
        )
      }

      if (!title || title.length < 8) {
        steps.push(
          makeStep(
            'improve-title',
            isRu ? 'Заголовок пустой или слишком общий.' : 'Title is empty or too generic.',
            language,
          ),
        )
      }

      if (!description || description.length < 40) {
        steps.push(
          makeStep(
            'improve-description',
            isRu
              ? 'Описание пустое или слишком короткое для продажи.'
              : 'Description is missing or too short to sell.',
            language,
          ),
        )
      }

      steps.push(
        makeStep(
          'estimate-price',
          isRu
            ? 'Цена выставлена без ориентира по рынку.'
            : 'Price is set without a market reference.',
          language,
        ),
      )

      return {
        id: crypto.randomUUID(),
        goal,
        steps,
        createdAt: Date.now(),
        source: 'rules',
      }
    },
  }
}

// --- LLM-планировщик -------------------------------------------------------

function extractJsonObject(value: string): string | null {
  const match = value.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

function buildPlannerPrompt(goal: AgentGoal, context: PlanContext): string {
  const isRu = context.language === 'ru'
  const values = context.values
  const missing = context.missingFields.length
    ? context.missingFields.join(', ')
    : isRu
      ? 'нет'
      : 'none'

  const listing = [
    `${isRu ? 'Категория' : 'Category'}: ${values.category}`,
    `${isRu ? 'Название' : 'Title'}: ${values.title.trim() || (isRu ? 'не указано' : 'not set')}`,
    `${isRu ? 'Цена' : 'Price'}: ${values.price.trim() || (isRu ? 'не указана' : 'not set')}`,
    `${isRu ? 'Длина описания' : 'Description length'}: ${values.description.trim().length}`,
    `${isRu ? 'Незаполненные поля' : 'Missing fields'}: ${missing}`,
  ].join('\n')

  return isRu
    ? `
Ты — модуль планирования AI-агента, который улучшает объявление на Авито.
Цель: ${goal} (привести карточку в порядок).
Доступные действия (используй ТОЛЬКО их):
- "suggest-category" — исправить категорию (auto/real_estate/electronics), если текущая неверна;
- "fill-attributes" — заполнить недостающие характеристики из названия/описания;
- "improve-title" — сделать заголовок точнее и информативнее;
- "improve-description" — сгенерировать/улучшить текст описания;
- "estimate-price" — оценить рыночную цену.
Выбери нужные шаги и упорядочи их (факты → тексты → цена). Не добавляй шаг, если он не нужен.
Верни ТОЛЬКО JSON без текста вокруг:
{"steps":[{"kind":"improve-description","reason":"коротко, почему"}]}

Состояние карточки:
${listing}
`.trim()
    : `
You are the planning module of an AI agent that improves a marketplace listing.
Goal: ${goal} (bring the listing into good shape).
Available actions (use ONLY these):
- "suggest-category" — fix the category (auto/real_estate/electronics) if the current one is wrong;
- "fill-attributes" — fill missing attributes from the title/description;
- "improve-title" — make the title clearer and more informative;
- "improve-description" — generate/improve the description text;
- "estimate-price" — estimate the market price.
Pick the needed steps and order them (facts → texts → price). Do not add a step that is not needed.
Return ONLY JSON with no surrounding text:
{"steps":[{"kind":"improve-description","reason":"short why"}]}

Listing state:
${listing}
`.trim()
}

function parsePlanSteps(rawText: string, language: Language): PlanStep[] {
  const json = extractJsonObject(rawText)

  if (!json) {
    return []
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(json)
  } catch {
    return []
  }

  const stepsValue = (parsed as { steps?: unknown }).steps

  if (!Array.isArray(stepsValue)) {
    return []
  }

  const seen = new Set<CapabilityKind>()
  const steps: PlanStep[] = []

  for (const raw of stepsValue) {
    if (typeof raw !== 'object' || raw === null) {
      continue
    }

    const kind = (raw as { kind?: unknown }).kind

    if (!isCapabilityKind(kind) || seen.has(kind)) {
      continue
    }

    seen.add(kind)

    const reasonValue = (raw as { reason?: unknown }).reason
    const reason =
      typeof reasonValue === 'string' && reasonValue.trim()
        ? reasonValue.trim()
        : CAPABILITY_TITLES[kind][language]

    steps.push({
      id: crypto.randomUUID(),
      kind,
      title: CAPABILITY_TITLES[kind][language],
      reason,
      status: 'pending',
    })
  }

  return steps
}

export function createLlmPlanner(client: ModelClient): Planner {
  return {
    async plan(goal, context, signal) {
      const result = await client.complete({
        messages: [
          {
            role: 'system',
            content:
              context.language === 'ru'
                ? 'Ты планировщик. Отвечай только корректным JSON.'
                : 'You are a planner. Reply with valid JSON only.',
          },
          { role: 'user', content: buildPlannerPrompt(goal, context) },
        ],
        temperature: 0.2,
        signal,
      })

      const steps = parsePlanSteps(result.text, context.language)

      if (steps.length === 0) {
        throw new Error('LLM planner returned no valid steps')
      }

      return {
        id: crypto.randomUUID(),
        goal,
        steps,
        createdAt: Date.now(),
        source: 'llm',
      }
    },
  }
}

// --- Resilient: LLM -> правила --------------------------------------------

export function createResilientPlanner(
  primary: Planner,
  fallback: Planner,
  onFallback?: (error: unknown) => void,
): Planner {
  return {
    async plan(goal, context, signal) {
      try {
        return await primary.plan(goal, context, signal)
      } catch (error) {
        if (signal?.aborted) {
          throw error
        }

        onFallback?.(error)
        return fallback.plan(goal, context, signal)
      }
    },
  }
}

// Готовая композиция для UI: модель строит план, при сбое — детерминированные правила.
export function createDefaultPlanner(
  client: ModelClient,
  onFallback?: (error: unknown) => void,
): Planner {
  return createResilientPlanner(createLlmPlanner(client), createRuleBasedPlanner(), onFallback)
}
