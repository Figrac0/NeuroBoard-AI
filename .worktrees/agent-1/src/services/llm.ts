import { getCategoryLabel, getFieldConfig } from '@/lib/item-config'
import { env } from '@/lib/env'
import type {
  AdChatMessage,
  DescriptionSuggestion,
  ItemFormValues,
  Language,
  PriceSuggestion,
} from '@/types/items'

interface OllamaResponse {
  response?: string
}

function serializeAdContext(values: ItemFormValues, language: Language): string {
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

async function requestOllama(
  prompt: string,
  language: Language,
  signal?: AbortSignal,
): Promise<string> {
  const response = await fetch(`${env.ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: env.ollamaModel,
      stream: false,
      prompt,
      options: {
        temperature: 0.35,
      },
    }),
    signal,
  })

  if (!response.ok) {
    throw new Error(
      language === 'ru'
        ? 'Не удалось обратиться к Ollama. Проверьте, что сервис запущен локально.'
        : 'Failed to reach Ollama. Make sure the local service is running.',
    )
  }

  const payload = (await response.json()) as OllamaResponse

  if (!payload.response?.trim()) {
    throw new Error(
      language === 'ru' ? 'Модель вернула пустой ответ.' : 'The model returned an empty response.',
    )
  }

  return payload.response.trim()
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

function parsePriceSuggestionFromText(rawText: string, language: Language): PriceSuggestion | null {
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

export async function improveDescription(
  values: ItemFormValues,
  signal?: AbortSignal,
  language: Language = 'ru',
): Promise<DescriptionSuggestion> {
  const prompt =
    language === 'en'
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

  const text = await requestOllama(prompt, language, signal)

  return {
    text: text.replace(/^["']|["']$/g, '').trim(),
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

  return requestOllama(prompt, language, signal)
}

export async function estimateMarketPrice(
  values: ItemFormValues,
  signal?: AbortSignal,
  language: Language = 'ru',
): Promise<PriceSuggestion> {
  const prompt =
    language === 'en'
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

  const rawText = await requestOllama(prompt, language, signal)
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
