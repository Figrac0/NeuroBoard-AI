// Инструменты агента — конкретные возможности (CapabilityKind).
// Переиспользуют построение промптов и парсинг из services/llm.ts, но ходят к модели
// через ctx.callModel (учёт токенов, ретраи, evidence). У каждого инструмента есть
// verify() — детерминированная проверка результата, замыкающая feedback loop runner-а.

import { getFieldConfig } from '@/lib/item-config'
import {
  buildAttributesPrompt,
  buildCategoryPrompt,
  buildImproveDescriptionPrompt,
  buildPriceEstimatePrompt,
  buildTitlePrompt,
  extractDescriptionText,
  extractTitle,
  parseAttributes,
  parseCategory,
  parsePriceSuggestionFromText,
} from '@/services/llm'
import type {
  Category,
  DescriptionSuggestion,
  FormParamValues,
  PriceSuggestion,
} from '@/types/items'

import { type AgentTool, type ToolRegistry } from './runner'

const DESCRIPTION_MIN = 60
const DESCRIPTION_MAX = 1000
const PRICE_LOW_RATIO = 0.2
const PRICE_HIGH_RATIO = 5

function withContext(
  prompt: string,
  context: { memoryHint?: string; feedback?: string },
  isRu: boolean,
): string {
  let result = prompt

  if (context.memoryHint) {
    result += isRu
      ? `\n\nПамять (опыт прошлых прогонов):\n${context.memoryHint}`
      : `\n\nMemory (lessons from past runs):\n${context.memoryHint}`
  }

  if (context.feedback) {
    result += isRu
      ? `\n\nЗамечание проверки предыдущей попытки: ${context.feedback}\nИсправь это и верни улучшенный результат.`
      : `\n\nVerifier feedback on the previous attempt: ${context.feedback}\nFix it and return an improved result.`
  }

  return result
}

const improveDescriptionTool: AgentTool<DescriptionSuggestion> = {
  kind: 'improve-description',
  async run(ctx) {
    const isRu = ctx.language === 'ru'
    const prompt = withContext(buildImproveDescriptionPrompt(ctx.values, ctx.language), ctx, isRu)
    const { text } = await ctx.callModel(
      prompt,
      isRu ? 'Сгенерировать улучшенный текст описания' : 'Generate an improved description',
    )
    const suggestion: DescriptionSuggestion = { text: extractDescriptionText(text) }

    return {
      output: suggestion,
      patch: { description: suggestion.text },
      summary: isRu
        ? `Подготовлено описание (${suggestion.text.length} символов)`
        : `Prepared description (${suggestion.text.length} chars)`,
    }
  },
  verify({ result, language }) {
    const isRu = language === 'ru'
    const length = result.output.text.trim().length

    if (length === 0) {
      return { ok: false, score: 0, feedback: isRu ? 'Описание пустое.' : 'Description is empty.' }
    }

    if (length > DESCRIPTION_MAX) {
      return {
        ok: false,
        score: 0.4,
        feedback: isRu
          ? `Слишком длинно (${length} символов), сократи до ${DESCRIPTION_MAX}.`
          : `Too long (${length} chars), trim to ${DESCRIPTION_MAX}.`,
      }
    }

    if (length < DESCRIPTION_MIN) {
      return {
        ok: false,
        score: length / DESCRIPTION_MIN,
        feedback: isRu
          ? `Слишком коротко (${length} символов), добавь деталей о состоянии, комплектации и преимуществах.`
          : `Too short (${length} chars), add details about condition, contents and benefits.`,
      }
    }

    return { ok: true, score: Math.min(1, length / 300), feedback: '' }
  },
}

const estimatePriceTool: AgentTool<PriceSuggestion> = {
  kind: 'estimate-price',
  async run(ctx) {
    const isRu = ctx.language === 'ru'
    const prompt = withContext(buildPriceEstimatePrompt(ctx.values, ctx.language), ctx, isRu)
    const { text } = await ctx.callModel(
      prompt,
      isRu ? 'Оценить рыночную цену по карточке' : 'Estimate market price from the listing',
    )
    const suggestion = parsePriceSuggestionFromText(text, ctx.language)

    if (!suggestion) {
      throw new Error(
        isRu
          ? 'Не удалось извлечь цену из ответа модели.'
          : 'Could not extract a price from the model response.',
      )
    }

    return {
      output: suggestion,
      patch: { price: String(suggestion.suggestedPrice) },
      summary: isRu
        ? `Рекомендованная цена: ${suggestion.suggestedPrice} ₽`
        : `Suggested price: ${suggestion.suggestedPrice} ₽`,
    }
  },
  verify({ values, result, language }) {
    const isRu = language === 'ru'
    const suggested = result.output.suggestedPrice

    if (!(suggested > 0)) {
      return {
        ok: false,
        score: 0,
        feedback: isRu ? 'Цена должна быть больше нуля.' : 'Price must be greater than zero.',
      }
    }

    const current = Number(values.price)

    if (Number.isFinite(current) && current > 0) {
      const ratio = suggested / current

      if (ratio < PRICE_LOW_RATIO || ratio > PRICE_HIGH_RATIO) {
        return {
          ok: false,
          score: 0.3,
          feedback: isRu
            ? `Оценка ${suggested} ₽ слишком далека от текущей ${current} ₽ (×${ratio.toFixed(1)}). Пересчитай в разумном диапазоне.`
            : `Estimate ${suggested} is too far from current ${current} (×${ratio.toFixed(1)}). Recompute within a sane range.`,
        }
      }
    }

    return { ok: true, score: 1, feedback: '' }
  },
}

const fillAttributesTool: AgentTool<FormParamValues> = {
  kind: 'fill-attributes',
  async run(ctx) {
    const isRu = ctx.language === 'ru'
    const prompt = withContext(buildAttributesPrompt(ctx.values, ctx.language), ctx, isRu)
    const { text } = await ctx.callModel(
      prompt,
      isRu ? 'Заполнить характеристики из карточки' : 'Fill attributes from the listing',
    )
    const inferred = parseAttributes(text, ctx.values.category, ctx.language)

    const nextParams: FormParamValues = { ...ctx.values.params }
    let added = 0
    for (const field of getFieldConfig(ctx.values.category)) {
      const value = inferred[field.key]
      if (value && !nextParams[field.key]?.trim()) {
        nextParams[field.key] = value
        added += 1
      }
    }

    return {
      output: inferred,
      patch: { params: nextParams },
      summary: isRu ? `Заполнено характеристик: ${added}` : `Filled attributes: ${added}`,
    }
  },
  verify({ values, language }) {
    const isRu = language === 'ru'
    const fields = getFieldConfig(values.category, language)
    const missing = fields.filter((field) => !values.params[field.key]?.trim())
    const score = fields.length === 0 ? 1 : (fields.length - missing.length) / fields.length

    if (score >= 0.5) {
      return { ok: true, score, feedback: '' }
    }

    return {
      ok: false,
      score,
      feedback: isRu
        ? `Не хватает характеристик: ${missing.map((field) => field.label).join(', ')}`
        : `Missing attributes: ${missing.map((field) => field.label).join(', ')}`,
    }
  },
}

const improveTitleTool: AgentTool<{ title: string }> = {
  kind: 'improve-title',
  async run(ctx) {
    const isRu = ctx.language === 'ru'
    const prompt = withContext(buildTitlePrompt(ctx.values, ctx.language), ctx, isRu)
    const { text } = await ctx.callModel(
      prompt,
      isRu ? 'Сформулировать точный заголовок' : 'Write a precise title',
    )
    const title = extractTitle(text)

    return {
      output: { title },
      patch: { title },
      summary: isRu ? `Заголовок: ${title}` : `Title: ${title}`,
    }
  },
  verify({ result, language }) {
    const isRu = language === 'ru'
    const length = result.output.title.length

    if (length === 0) {
      return { ok: false, score: 0, feedback: isRu ? 'Заголовок пустой.' : 'Title is empty.' }
    }
    if (length > 80) {
      return {
        ok: false,
        score: 0.5,
        feedback: isRu ? 'Заголовок слишком длинный.' : 'Title is too long.',
      }
    }

    return { ok: true, score: 1, feedback: '' }
  },
}

const suggestCategoryTool: AgentTool<{ category: Category }> = {
  kind: 'suggest-category',
  async run(ctx) {
    const isRu = ctx.language === 'ru'
    const { text } = await ctx.callModel(
      buildCategoryPrompt(ctx.values, ctx.language),
      isRu ? 'Определить категорию объявления' : 'Classify the listing category',
    )
    const category = parseCategory(text)

    if (!category) {
      throw new Error(
        isRu ? 'Не удалось определить категорию.' : 'Could not classify the category.',
      )
    }

    return {
      output: { category },
      patch: { category },
      summary: isRu ? `Категория: ${category}` : `Category: ${category}`,
    }
  },
  // parseCategory уже гарантирует валидный enum — проверка тривиальна.
  verify() {
    return { ok: true, score: 1, feedback: '' }
  },
}

export function createDefaultRegistry(): ToolRegistry {
  return {
    'suggest-category': suggestCategoryTool,
    'fill-attributes': fillAttributesTool,
    'improve-title': improveTitleTool,
    'improve-description': improveDescriptionTool,
    'estimate-price': estimatePriceTool,
  }
}
