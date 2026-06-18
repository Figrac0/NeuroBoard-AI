import { createConfiguredModelClient } from '@/agent-harness/config'
import { type ModelClient } from '@/agent-harness/model-client'
import { isAbortError } from '@/lib/format'
import { getCategoryLabel, getFieldConfig } from '@/lib/item-config'
import type {
  AdChatMessage,
  Category,
  DescriptionSuggestion,
  FormParamValues,
  ItemFormValues,
  Language,
  PriceSuggestion,
} from '@/types/items'

export function serializeAdContext(values: ItemFormValues, language: Language): string {
  const params = getFieldConfig(values.category, language)
    .map((field) => {
      const value = values.params[field.key]?.trim()
      if (!value) {
        return null
      }

      return `- ${field.label}: ${value}`
    })
    .filter((item): item is string => item !== null)
    .join('\n')

  if (language === 'en') {
    return [
      `Category: ${getCategoryLabel(values.category, language)}`,
      `Title: ${values.title.trim() || 'Not specified'}`,
      `Price: ${values.price.trim() || 'Not specified'}`,
      params ? `Attributes:\n${params}` : 'Attributes: not filled',
      values.description.trim()
        ? `Current description:\n${values.description.trim()}`
        : 'Current description is missing.',
    ].join('\n\n')
  }

  return [
    `Категория: ${getCategoryLabel(values.category, language)}`,
    `Название: ${values.title.trim() || 'Не указано'}`,
    `Цена: ${values.price.trim() || 'Не указана'}`,
    params ? `Характеристики:\n${params}` : 'Характеристики: не заполнены',
    values.description.trim()
      ? `Текущее описание:\n${values.description.trim()}`
      : 'Текущее описание отсутствует.',
  ].join('\n\n')
}

// Общий клиент модели (Ollama или OmniRoute) создаётся лениво из env.
// Существующие AI-функции ходят через него и получают сменный провайдер плюс
// учёт токенов, но их сигнатуры и поведение для UI остаются прежними.
let sharedClient: ModelClient | null = null

function getModelClient(): ModelClient {
  if (!sharedClient) {
    sharedClient = createConfiguredModelClient()
  }

  return sharedClient
}

async function requestModel(
  prompt: string,
  language: Language,
  signal?: AbortSignal,
): Promise<string> {
  try {
    const result = await getModelClient().complete({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.35,
      signal,
    })

    return result.text
  } catch (error) {
    if (isAbortError(error)) {
      throw error
    }

    throw new Error(
      language === 'ru'
        ? 'Не удалось получить ответ от модели. Проверьте, что провайдер LLM доступен.'
        : 'Failed to get a model response. Make sure the LLM provider is available.',
    )
  }
}

function extractJsonBlock(value: string): string | null {
  const match = value.match(/\{[\s\S]*\}/)
  return match ? match[0] : null
}

function cleanReasoning(value: string, language: Language): string {
  const normalized = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').trim()

  const looksLikePayload =
    normalized.startsWith('{') ||
    /"suggestedPrice"|"minPrice"|"maxPrice"|"confidence"|"reasoning"/.test(normalized)

  if (normalized && !looksLikePayload) {
    return normalized
  }

  return language === 'ru'
    ? 'Модель оценила цену по текущим параметрам объявления.'
    : 'The model estimated the price using the current listing details.'
}

export function parsePriceSuggestionFromText(
  rawText: string,
  language: Language,
): PriceSuggestion | null {
  const jsonBlock = extractJsonBlock(rawText)

  if (jsonBlock) {
    try {
      const parsed = JSON.parse(jsonBlock) as Partial<PriceSuggestion>

      if (typeof parsed.suggestedPrice === 'number' && parsed.suggestedPrice > 0) {
        return {
          suggestedPrice: Math.round(parsed.suggestedPrice),
          minPrice: typeof parsed.minPrice === 'number' ? Math.round(parsed.minPrice) : undefined,
          maxPrice: typeof parsed.maxPrice === 'number' ? Math.round(parsed.maxPrice) : undefined,
          confidence:
            parsed.confidence === 'low' ||
            parsed.confidence === 'medium' ||
            parsed.confidence === 'high'
              ? parsed.confidence
              : 'medium',
          reasoning: cleanReasoning(
            typeof parsed.reasoning === 'string' ? parsed.reasoning : '',
            language,
          ),
        }
      }
    } catch {
      const suggestedPriceMatch = jsonBlock.match(/"suggestedPrice"\s*:\s*(\d+)/i)
      const minPriceMatch = jsonBlock.match(/"minPrice"\s*:\s*(\d+)/i)
      const maxPriceMatch = jsonBlock.match(/"maxPrice"\s*:\s*(\d+)/i)
      const confidenceMatch = jsonBlock.match(/"confidence"\s*:\s*"(low|medium|high)"/i)
      const reasoningMatch = jsonBlock.match(/"reasoning"\s*:\s*"([\s\S]*)"\s*\}\s*$/i)
      const suggestedPrice = suggestedPriceMatch ? Number(suggestedPriceMatch[1]) : Number.NaN
      const confidenceValue = confidenceMatch?.[1]

      if (Number.isFinite(suggestedPrice) && suggestedPrice > 0) {
        return {
          suggestedPrice: Math.round(suggestedPrice),
          minPrice: minPriceMatch ? Math.round(Number(minPriceMatch[1])) : undefined,
          maxPrice: maxPriceMatch ? Math.round(Number(maxPriceMatch[1])) : undefined,
          confidence:
            confidenceValue === 'low' || confidenceValue === 'medium' || confidenceValue === 'high'
              ? confidenceValue
              : 'medium',
          reasoning: cleanReasoning(reasoningMatch?.[1] ?? '', language),
        }
      }
    }
  }

  const firstNumber = rawText.match(/\d[\d\s]{2,}/)?.[0]?.replace(/\s+/g, '')
  const suggestedPrice = firstNumber ? Number(firstNumber) : Number.NaN

  if (!Number.isFinite(suggestedPrice) || suggestedPrice <= 0) {
    return null
  }

  return {
    suggestedPrice: Math.round(suggestedPrice),
    confidence: 'low',
    reasoning: cleanReasoning(rawText.replace(/\{[\s\S]*\}/, ''), language),
  }
}

export function buildImproveDescriptionPrompt(values: ItemFormValues, language: Language): string {
  return language === 'en'
    ? `
You improve marketplace listings.
Reply only in English.
Keep only facts from the listing and never invent missing attributes.
Write a clear, appealing, human-sounding description without spam.
Limit: 900 characters maximum.
Do not use markdown, headings, bullet lists, or quotes around the answer.
If the description is empty, create it from scratch. If it exists, improve it.

Listing:
${serializeAdContext(values, language)}

Return only the final description text.
`.trim()
    : `
Ты помогаешь улучшать объявления на Авито.
Работай на русском языке.
Сохраняй только факты из карточки и не придумывай новые характеристики.
Сделай описание живым, понятным и продающим, но без маркетингового спама.
Ограничение: до 900 символов.
Не используй markdown, заголовки, списки и кавычки вокруг результата.
Если описания нет, создай его с нуля. Если есть, улучши существующий текст.

Карточка объявления:
${serializeAdContext(values, language)}

Верни только готовый текст описания.
`.trim()
}

export function extractDescriptionText(text: string): string {
  return text.replace(/^["']|["']$/g, '').trim()
}

export async function improveDescription(
  values: ItemFormValues,
  signal?: AbortSignal,
  language: Language = 'ru',
): Promise<DescriptionSuggestion> {
  const text = await requestModel(buildImproveDescriptionPrompt(values, language), language, signal)

  return {
    text: extractDescriptionText(text),
  }
}

export async function askAdAssistant(
  values: ItemFormValues,
  history: AdChatMessage[],
  question: string,
  signal?: AbortSignal,
  language: Language = 'ru',
): Promise<string> {
  const normalizedHistory = history
    .slice(-6)
    .map((message) =>
      language === 'en'
        ? `${message.role === 'user' ? 'User' : 'Assistant'}: ${message.content}`
        : `${message.role === 'user' ? 'Пользователь' : 'Ассистент'}: ${message.content}`,
    )
    .join('\n')

  const prompt =
    language === 'en'
      ? `
You are an AI copilot for an online marketplace seller.
Reply only in English.
Help with this exact listing: suggest how to improve wording, price presentation, and listing quality.
Do not invent attributes that are not in the listing.
Keep the answer short, practical, and friendly.

Listing:
${serializeAdContext(values, language)}

Conversation history:
${normalizedHistory || 'History is empty.'}

New user question:
${question}

Return only the assistant answer.
`.trim()
      : `
Ты AI-помощник продавца на Авито.
Отвечай только на русском языке.
Помогай по конкретному объявлению: подсказывай, как улучшить текст, цену и подачу.
Не придумывай характеристик, которых нет в карточке.
Отвечай коротко, по делу и дружелюбно.

Карточка объявления:
${serializeAdContext(values, language)}

История диалога:
${normalizedHistory || 'История пуста.'}

Новый вопрос пользователя:
${question}

Верни только ответ ассистента.
`.trim()

  return requestModel(prompt, language, signal)
}

export function buildPriceEstimatePrompt(values: ItemFormValues, language: Language): string {
  return language === 'en'
    ? `
You estimate a fair market price for a listing in Russia.
If the data is incomplete, use a cautious range and explain the uncertainty.
Return only JSON and nothing else.
Response format:
{
  "suggestedPrice": 0,
  "minPrice": 0,
  "maxPrice": 0,
  "confidence": "low | medium | high",
  "reasoning": "short explanation in English"
}

Listing:
${serializeAdContext(values, language)}
`.trim()
    : `
Ты оцениваешь рыночную цену объявления для России.
Если данных мало, выбери осторожный диапазон и поясни неопределённость.
Верни только JSON без пояснений вне JSON.
Формат ответа:
{
  "suggestedPrice": 0,
  "minPrice": 0,
  "maxPrice": 0,
  "confidence": "low | medium | high",
  "reasoning": "краткое объяснение на русском языке"
}

Карточка объявления:
${serializeAdContext(values, language)}
`.trim()
}

export async function estimateMarketPrice(
  values: ItemFormValues,
  signal?: AbortSignal,
  language: Language = 'ru',
): Promise<PriceSuggestion> {
  const rawText = await requestModel(buildPriceEstimatePrompt(values, language), language, signal)
  const suggestion = parsePriceSuggestionFromText(rawText, language)

  if (!suggestion) {
    throw new Error(
      language === 'ru'
        ? 'Не удалось извлечь числовую цену из ответа модели.'
        : 'Could not extract a numeric price from the model response.',
    )
  }

  return suggestion
}

// --- Заголовок ------------------------------------------------------------

export function buildTitlePrompt(values: ItemFormValues, language: Language): string {
  return language === 'en'
    ? `You write concise marketplace titles.
Create a clear, specific title (max 60 characters) for this listing using only its facts.
Return only the title text, without quotes.

Listing:
${serializeAdContext(values, language)}`
    : `Ты пишешь короткие заголовки для объявлений на Авито.
Составь точный, понятный заголовок (до 60 символов) на основе фактов карточки.
Верни только текст заголовка, без кавычек.

Карточка:
${serializeAdContext(values, language)}`
}

export function extractTitle(text: string): string {
  return (text.split('\n')[0] ?? '')
    .replace(/^["']|["']$/g, '')
    .trim()
    .slice(0, 80)
}

// --- Характеристики (params категории) ------------------------------------

export function buildAttributesPrompt(values: ItemFormValues, language: Language): string {
  const isEn = language === 'en'
  const schema = getFieldConfig(values.category, language)
    .map((field) => {
      if (field.type === 'select') {
        const options = field.options?.map((option) => option.value).join(' | ') ?? ''
        return `- "${field.key}" (${field.label}): ${isEn ? 'one of' : 'одно из'} [${options}]`
      }
      const kind = field.type === 'number' ? (isEn ? 'number' : 'число') : isEn ? 'text' : 'текст'
      return `- "${field.key}" (${field.label}): ${kind}`
    })
    .join('\n')

  return isEn
    ? `You extract structured attributes for a marketplace listing.
Infer attributes ONLY from the title and description below. If you are not confident about a field, omit it.
For select fields use exactly one of the allowed values.
Return ONLY a JSON object with these keys (omit the ones you cannot infer):
${schema}

Listing:
${serializeAdContext(values, language)}`
    : `Ты извлекаешь характеристики для карточки объявления.
Выводи характеристики ТОЛЬКО из названия и описания ниже. Если не уверен в значении — пропусти поле.
Для полей-списков используй ровно одно из допустимых значений.
Верни ТОЛЬКО JSON-объект с этими ключами (неизвестные пропусти):
${schema}

Карточка:
${serializeAdContext(values, language)}`
}

export function parseAttributes(
  rawText: string,
  category: Category,
  language: Language = 'ru',
): FormParamValues {
  const result: FormParamValues = {}
  const block = extractJsonBlock(rawText)

  if (!block) {
    return result
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(block)
  } catch {
    return result
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return result
  }

  const source = parsed as Record<string, unknown>

  for (const field of getFieldConfig(category, language)) {
    const raw = source[field.key]
    if (raw == null) {
      continue
    }

    const value = String(raw).trim()
    if (!value) {
      continue
    }

    if (field.type === 'select') {
      const match = field.options?.find(
        (option) => option.value === value || option.label === value,
      )
      if (!match) {
        continue
      }
      result[field.key] = match.value
    } else {
      result[field.key] = value
    }
  }

  return result
}

// --- Категория ------------------------------------------------------------

const CATEGORY_VALUES: Category[] = ['auto', 'real_estate', 'electronics']

export function buildCategoryPrompt(values: ItemFormValues, language: Language): string {
  return language === 'en'
    ? `Classify this listing into exactly one category id: auto, real_estate, electronics.
Return ONLY the category id.

Listing:
${serializeAdContext(values, language)}`
    : `Определи категорию объявления — ровно один id: auto, real_estate, electronics.
Верни ТОЛЬКО id категории.

Карточка:
${serializeAdContext(values, language)}`
}

export function parseCategory(rawText: string): Category | null {
  const lower = rawText.toLowerCase()
  for (const candidate of CATEGORY_VALUES) {
    if (lower.includes(candidate)) {
      return candidate
    }
  }
  return null
}
