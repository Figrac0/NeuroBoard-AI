import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { ClearableInput } from '@/components/ClearableInput'
import { ErrorState } from '@/components/ErrorState'
import { FormField } from '@/components/FormField'
import { Icon } from '@/components/Icon'
import { LoadingState } from '@/components/LoadingState'
import { SelectField } from '@/components/SelectField'
import { StatusBanner } from '@/components/StatusBanner'
import { RevisionChecklist } from '@/features/ads/RevisionChecklist'
import { DescriptionDiff } from '@/features/edit/DescriptionDiff'
import { DynamicParamFields } from '@/features/edit/DynamicParamFields'
import { useDraftSync } from '@/features/edit/useDraftSync'
import {
  buildItemUpdateInput,
  createItemFormSchema,
  EMPTY_FORM_VALUES,
  getRevisionProbe,
  mapItemToFormValues,
  sanitizeFormValues,
} from '@/lib/forms'
import { getConfidenceLabel, getErrorMessage, isAbortError } from '@/lib/format'
import { getCategoryOptions } from '@/lib/item-config'
import { queryClient } from '@/lib/queryClient'
import { getMissingFieldLabels } from '@/lib/revision'
import { readStorage, writeStorage } from '@/lib/storage'
import { askAdAssistant, estimateMarketPrice, improveDescription } from '@/services/llm'
import { getItemById, updateItem } from '@/services/items'
import { useLanguageStore } from '@/stores/languageStore'
import { useToastStore } from '@/stores/toastStore'
import type {
  AdChatMessage,
  DescriptionSuggestion,
  ItemFormValues,
  PriceSuggestion,
} from '@/types/items'

export function AdEditPage() {
  const { id = '' } = useParams()
  const language = useLanguageStore((store) => store.language)
  const isRu = language === 'ru'
  const schema = useMemo(() => createItemFormSchema(language), [language])
  const navigate = useNavigate()
  const pushToast = useToastStore((store) => store.pushToast)
  const [baselineValues, setBaselineValues] = useState<ItemFormValues | null>(null)
  const [descriptionSuggestion, setDescriptionSuggestion] = useState<DescriptionSuggestion | null>(
    null,
  )
  const [priceSuggestion, setPriceSuggestion] = useState<PriceSuggestion | null>(null)
  const [descriptionError, setDescriptionError] = useState<string | null>(null)
  const [priceError, setPriceError] = useState<string | null>(null)
  const [isDescriptionLoading, setIsDescriptionLoading] = useState(false)
  const [isPriceLoading, setIsPriceLoading] = useState(false)
  const [hasRequestedDescription, setHasRequestedDescription] = useState(false)
  const [hasRequestedPrice, setHasRequestedPrice] = useState(false)
  const [chatMessages, setChatMessages] = useState<AdChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatError, setChatError] = useState<string | null>(null)
  const [isChatLoading, setIsChatLoading] = useState(false)

  const descriptionAbortRef = useRef<AbortController | null>(null)
  const priceAbortRef = useRef<AbortController | null>(null)
  const saveAbortRef = useRef<AbortController | null>(null)
  const chatAbortRef = useRef<AbortController | null>(null)
  const chatHistoryRef = useRef<HTMLDivElement | null>(null)

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(schema),
    mode: 'onBlur',
    defaultValues: EMPTY_FORM_VALUES,
  })

  const itemQuery = useQuery({
    queryKey: ['item', id],
    queryFn: ({ signal }) => getItemById(id, signal),
  })

  useEffect(() => {
    if (!itemQuery.data) {
      return
    }

    const nextValues = mapItemToFormValues(itemQuery.data)
    setBaselineValues(nextValues)
    form.reset(nextValues)
  }, [form, itemQuery.data])

  useEffect(() => {
    return () => {
      descriptionAbortRef.current?.abort()
      priceAbortRef.current?.abort()
      saveAbortRef.current?.abort()
      chatAbortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    chatHistoryRef.current?.scrollTo({
      top: chatHistoryRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [chatMessages, isChatLoading])

  const category = useWatch({
    control: form.control,
    name: 'category',
  })
  const descriptionValue = useWatch({
    control: form.control,
    name: 'description',
  })
  const liveSnapshot = useWatch({ control: form.control })
  const liveValues = sanitizeFormValues(liveSnapshot)
  const currentMissingFields = getMissingFieldLabels(getRevisionProbe(liveValues), language)

  const { pendingDraft, restoreDraft, discardDraft, clearDraft } = useDraftSync({
    itemId: id,
    baselineValues,
    form,
  })

  useEffect(() => {
    const storageKey = `avito-ai-chat:${id}`
    const storedMessages = readStorage<AdChatMessage[]>(storageKey)
    setChatMessages(Array.isArray(storedMessages) ? storedMessages : [])
  }, [id])

  useEffect(() => {
    writeStorage(`avito-ai-chat:${id}`, chatMessages)
  }, [chatMessages, id])

  const runDescriptionSuggestion = async () => {
    const isValid = await form.trigger(['category', 'title', 'price'])

    if (!isValid) {
      return
    }

    descriptionAbortRef.current?.abort()
    const controller = new AbortController()
    descriptionAbortRef.current = controller
    setIsDescriptionLoading(true)
    setDescriptionError(null)

    try {
      const suggestion = await improveDescription(
        sanitizeFormValues(form.getValues()),
        controller.signal,
        language,
      )
      setDescriptionSuggestion(suggestion)
      setHasRequestedDescription(true)
    } catch (error) {
      if (!isAbortError(error)) {
        setDescriptionError(getErrorMessage(error, language))
        setHasRequestedDescription(true)
      }
    } finally {
      if (descriptionAbortRef.current === controller) {
        descriptionAbortRef.current = null
      }
      setIsDescriptionLoading(false)
    }
  }

  const runPriceSuggestion = async () => {
    const isValid = await form.trigger(['category', 'title', 'price'])

    if (!isValid) {
      return
    }

    priceAbortRef.current?.abort()
    const controller = new AbortController()
    priceAbortRef.current = controller
    setIsPriceLoading(true)
    setPriceError(null)

    try {
      const suggestion = await estimateMarketPrice(
        sanitizeFormValues(form.getValues()),
        controller.signal,
        language,
      )
      setPriceSuggestion(suggestion)
      setHasRequestedPrice(true)
    } catch (error) {
      if (!isAbortError(error)) {
        setPriceError(getErrorMessage(error, language))
        setHasRequestedPrice(true)
      }
    } finally {
      if (priceAbortRef.current === controller) {
        priceAbortRef.current = null
      }
      setIsPriceLoading(false)
    }
  }

  const handleSave = form.handleSubmit(async (values) => {
    saveAbortRef.current?.abort()
    const controller = new AbortController()
    saveAbortRef.current = controller

    try {
      await updateItem(id, buildItemUpdateInput(values), controller.signal)
      clearDraft()
      await queryClient.invalidateQueries({ queryKey: ['item', id] })
      await queryClient.invalidateQueries({ queryKey: ['items'] })
      pushToast({
        tone: 'success',
        title: isRu ? 'Изменения сохранены' : 'Changes saved',
        description: isRu ? 'Карточка объявления обновлена.' : 'The listing card was updated.',
      })
      navigate(`/ads/${id}`)
    } catch (error) {
      if (isAbortError(error)) {
        return
      }

      pushToast({
        tone: 'error',
        title: isRu ? 'Сохранение не удалось' : 'Save failed',
        description: getErrorMessage(error, language),
      })
    } finally {
      if (saveAbortRef.current === controller) {
        saveAbortRef.current = null
      }
    }
  })

  const sendChatMessage = async () => {
    const question = chatInput.trim()

    if (!question || isChatLoading) {
      return
    }

    chatAbortRef.current?.abort()
    const controller = new AbortController()
    chatAbortRef.current = controller

    const userMessage: AdChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: question,
    }

    const nextHistory = [...chatMessages, userMessage]

    setChatMessages(nextHistory)
    setChatInput('')
    setChatError(null)
    setIsChatLoading(true)

    try {
      const answer = await askAdAssistant(
        sanitizeFormValues(form.getValues()),
        nextHistory,
        question,
        controller.signal,
        language,
      )

      setChatMessages((currentMessages) => [
        ...currentMessages,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: answer,
        },
      ])
    } catch (error) {
      if (!isAbortError(error)) {
        setChatError(getErrorMessage(error, language))
      }
    } finally {
      if (chatAbortRef.current === controller) {
        chatAbortRef.current = null
      }
      setIsChatLoading(false)
    }
  }

  const handleChatKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void sendChatMessage()
    }
  }

  if (itemQuery.isLoading) {
    return (
      <LoadingState
        title={isRu ? 'Загружаем форму редактирования' : 'Loading the edit form'}
        description={
          isRu
            ? 'Подтягиваем данные объявления и восстанавливаем черновик.'
            : 'Fetching the listing data and restoring the draft.'
        }
      />
    )
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <ErrorState
        description={
          isRu
            ? 'Не удалось открыть форму редактирования. Проверьте backend и попробуйте снова.'
            : 'Could not open the edit form. Check the backend and try again.'
        }
        onRetry={() => void itemQuery.refetch()}
      />
    )
  }

  const descriptionButtonLabel = isDescriptionLoading
    ? isRu
      ? 'Выполняется запрос'
      : 'Generating'
    : hasRequestedDescription || descriptionSuggestion
      ? isRu
        ? 'Повторить запрос'
        : 'Try again'
      : descriptionValue?.trim()
        ? isRu
          ? 'Улучшить описание'
          : 'Improve description'
        : isRu
          ? 'Придумать описание'
          : 'Generate description'

  const priceButtonLabel = isPriceLoading
    ? isRu
      ? 'Выполняется запрос'
      : 'Requesting'
    : hasRequestedPrice || priceSuggestion
      ? isRu
        ? 'Повторить запрос'
        : 'Try again'
      : isRu
        ? 'Узнать рыночную цену'
        : 'Estimate market price'

  return (
    <section className="page-stack page-stack--edit">
      <Link to={`/ads/${id}`} className="back-link">
        <span className="back-link__icon">
          <Icon name="arrow-left" />
        </span>
        <span className="back-link__text">{isRu ? 'К объявлению' : 'Back to listing'}</span>
      </Link>

      <header className="page-header">
        <div>
          <h1>{isRu ? 'Редактирование объявления' : 'Edit listing'}</h1>
        </div>
      </header>

      {pendingDraft ? (
        <StatusBanner
          tone="info"
          title={isRu ? 'Найден несохранённый черновик' : 'Unsaved draft found'}
          description={
            isRu
              ? 'Можно восстановить черновик после случайного обновления страницы.'
              : 'You can restore the draft after an accidental page refresh.'
          }
        >
          <div className="inline-actions">
            <button type="button" className="button button--primary" onClick={restoreDraft}>
              {isRu ? 'Восстановить' : 'Restore'}
            </button>
            <button type="button" className="button button--secondary" onClick={discardDraft}>
              {isRu ? 'Отбросить' : 'Discard'}
            </button>
          </div>
        </StatusBanner>
      ) : null}

      {currentMissingFields.length ? (
        <StatusBanner
          tone="warning"
          className="status-banner--compact-width"
          title={
            isRu ? 'Часть полей всё ещё требует доработки' : 'Some fields still need improvement'
          }
          description={
            isRu
              ? 'Незаполненные характеристики и описание не блокируют сохранение, но снижают качество объявления.'
              : 'Missing attributes and description do not block saving, but they reduce listing quality.'
          }
        >
          <RevisionChecklist items={currentMissingFields} />
        </StatusBanner>
      ) : null}

      <form className="edit-form" onSubmit={handleSave}>
        <div className="form-grid form-grid--main">
          <FormField
            label={isRu ? 'Категория' : 'Category'}
            htmlFor="field-category"
            required
            error={form.formState.errors.category?.message}
          >
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <SelectField
                  id="field-category"
                  value={field.value}
                  options={getCategoryOptions(language)}
                  onChange={field.onChange}
                />
              )}
            />
          </FormField>

          <FormField
            label={isRu ? 'Название' : 'Title'}
            htmlFor="field-title"
            required
            error={form.formState.errors.title?.message}
          >
            <Controller
              control={form.control}
              name="title"
              render={({ field }) => (
                <ClearableInput id="field-title" value={field.value} onChange={field.onChange} />
              )}
            />
          </FormField>

          <div className="price-row">
            <FormField
              label={isRu ? 'Цена' : 'Price'}
              htmlFor="field-price"
              required
              error={form.formState.errors.price?.message}
            >
              <Controller
                control={form.control}
                name="price"
                render={({ field }) => (
                  <ClearableInput
                    id="field-price"
                    type="number"
                    inputMode="numeric"
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
            </FormField>

            <button
              type="button"
              className="button button--ghost"
              onClick={() => void runPriceSuggestion()}
              disabled={isPriceLoading}
            >
              <Icon name="price" />
              {priceButtonLabel}
            </button>
          </div>
        </div>

        {priceSuggestion ? (
          <section className="ai-card ai-card--price">
            <div className="ai-card__header">
              <div>
                <p className="ai-card__eyebrow">{isRu ? 'Ответ AI' : 'AI result'}</p>
                <h2>{isRu ? 'Рыночная цена' : 'Market price'}</h2>
              </div>
              <span className="badge badge--ghost">
                {isRu ? 'Уверенность' : 'Confidence'}:{' '}
                {getConfidenceLabel(priceSuggestion.confidence, language)}
              </span>
            </div>
            <p className="ai-card__highlight">
              {priceSuggestion.suggestedPrice} {isRu ? '₽' : '₽'}
            </p>
            {priceSuggestion.minPrice || priceSuggestion.maxPrice ? (
              <p className="muted-text">
                {isRu ? 'Диапазон' : 'Range'}: {priceSuggestion.minPrice ?? '...'} -{' '}
                {priceSuggestion.maxPrice ?? '...'} ₽
              </p>
            ) : null}
            <p className="ai-card__text">{priceSuggestion.reasoning}</p>
            <div className="inline-actions">
              <button
                type="button"
                className="button button--primary"
                onClick={() => {
                  if (Number(form.getValues('price')) !== priceSuggestion.suggestedPrice) {
                    form.setValue('price', String(priceSuggestion.suggestedPrice), {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  setPriceSuggestion(null)
                }}
              >
                {isRu ? 'Применить' : 'Apply'}
              </button>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setPriceSuggestion(null)}
              >
                {isRu ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </section>
        ) : null}

        {priceError ? (
          <StatusBanner
            tone="error"
            title={isRu ? 'Произошла ошибка при запросе цены' : 'Price request failed'}
            description={priceError}
          >
            <div className="inline-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setPriceError(null)}
              >
                {isRu ? 'Закрыть' : 'Close'}
              </button>
            </div>
          </StatusBanner>
        ) : null}

        <section className="card-section">
          <h2>{isRu ? 'Характеристики' : 'Attributes'}</h2>
          <DynamicParamFields category={category || itemQuery.data.category} form={form} />
        </section>

        <section className="card-section">
          <div className="section-heading">
            <div>
              <h2>{isRu ? 'Описание' : 'Description'}</h2>
              <p className="muted-text">
                {descriptionValue?.length || 0} / 1000 {isRu ? 'символов' : 'characters'}
              </p>
            </div>
          </div>

          <FormField
            label={isRu ? 'Текст описания' : 'Description text'}
            htmlFor="field-description"
            error={form.formState.errors.description?.message}
          >
            <textarea
              id="field-description"
              className="input input--textarea"
              rows={7}
              {...form.register('description')}
            />
          </FormField>

          {!descriptionSuggestion ? (
            <div className="inline-actions inline-actions--description">
              {descriptionValue ? (
                <button
                  type="button"
                  className="button button--secondary button--small"
                  onClick={() =>
                    form.setValue('description', '', {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                >
                  {isRu ? 'Очистить' : 'Clear'}
                </button>
              ) : null}

              <button
                type="button"
                className="button button--ghost"
                onClick={() => void runDescriptionSuggestion()}
                disabled={isDescriptionLoading}
              >
                <Icon name="sparkles" />
                {descriptionButtonLabel}
              </button>
            </div>
          ) : null}

          {descriptionSuggestion ? (
            <section className="ai-card ai-card--description">
              <div className="ai-card__header">
                <div>
                  <p className="ai-card__eyebrow">{isRu ? 'Ответ AI' : 'AI result'}</p>
                  <h2>{isRu ? 'Новый вариант описания' : 'Suggested description'}</h2>
                </div>
              </div>
              <p className="ai-card__text">{descriptionSuggestion.text}</p>
              <DescriptionDiff before={descriptionValue || ''} after={descriptionSuggestion.text} />
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => {
                    if (descriptionValue.trim() !== descriptionSuggestion.text.trim()) {
                      form.setValue('description', descriptionSuggestion.text, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    setDescriptionSuggestion(null)
                  }}
                >
                  {isRu ? 'Применить' : 'Apply'}
                </button>
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setDescriptionSuggestion(null)}
                >
                  {isRu ? 'Закрыть' : 'Close'}
                </button>
              </div>
            </section>
          ) : null}

          {descriptionError ? (
            <StatusBanner
              tone="error"
              title={isRu ? 'Произошла ошибка при запросе описания' : 'Description request failed'}
              description={descriptionError}
            >
              <div className="inline-actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => setDescriptionError(null)}
                >
                  {isRu ? 'Закрыть' : 'Close'}
                </button>
              </div>
            </StatusBanner>
          ) : null}
        </section>

        <section className="card-section card-section--chat">
          <div className="section-heading">
            <div>
              <h2>{isRu ? 'Чат с AI' : 'AI chat'}</h2>
              <p className="muted-text">
                {isRu
                  ? 'Уточняйте детали по объявлению, просите советы по описанию и цене.'
                  : 'Ask for listing-specific advice about wording, details, and pricing.'}
              </p>
            </div>

            {chatMessages.length ? (
              <button
                type="button"
                className="button button--secondary button--small"
                onClick={() => {
                  setChatMessages([])
                  setChatError(null)
                }}
              >
                {isRu ? 'Очистить чат' : 'Clear chat'}
              </button>
            ) : null}
          </div>

          <div className="chat-panel">
            {chatMessages.length || isChatLoading ? (
              <div ref={chatHistoryRef} className="chat-panel__history">
                {chatMessages.map((message) => (
                  <article
                    key={message.id}
                    className={
                      message.role === 'assistant'
                        ? 'chat-message chat-message--assistant'
                        : 'chat-message chat-message--user'
                    }
                  >
                    <p className="chat-message__role">
                      {message.role === 'assistant' ? 'AI' : isRu ? 'Вы' : 'You'}
                    </p>
                    <p className="chat-message__content">{message.content}</p>
                  </article>
                ))}

                {isChatLoading ? (
                  <article className="chat-message chat-message--assistant chat-message--pending">
                    <p className="chat-message__role">AI</p>
                    <div className="chat-typing" aria-label={isRu ? 'AI печатает' : 'AI is typing'}>
                      <span />
                      <span />
                      <span />
                    </div>
                  </article>
                ) : null}
              </div>
            ) : null}

            <div className="chat-composer">
              <label className="sr-only" htmlFor="chat-question">
                {isRu ? 'Вопрос для AI' : 'Question for AI'}
              </label>
              <textarea
                id="chat-question"
                className="chat-composer__input"
                rows={2}
                value={chatInput}
                onChange={(event) => setChatInput(event.target.value)}
                onKeyDown={handleChatKeyDown}
                placeholder={
                  isRu
                    ? 'Спросите AI: «Что лучше уточнить в описании для быстрой продажи?»'
                    : 'Ask AI: “What should I clarify in the description to sell faster?”'
                }
              />
              <button
                type="button"
                className="chat-composer__send"
                onClick={() => void sendChatMessage()}
                disabled={!chatInput.trim() || isChatLoading}
                aria-label={isRu ? 'Спросить AI' : 'Ask AI'}
              >
                <Icon name="send" />
                <span>{isRu ? 'Спросить AI' : 'Ask AI'}</span>
              </button>
            </div>

            {chatError ? (
              <StatusBanner
                tone="error"
                title={
                  isRu ? 'Не удалось получить ответ в чате' : 'Could not get the chat response'
                }
                description={chatError}
              />
            ) : null}
          </div>
        </section>

        <div className="page-actions">
          <button
            type="submit"
            className="button button--primary"
            disabled={form.formState.isSubmitting}
          >
            {isRu ? 'Сохранить' : 'Save'}
          </button>
          <button
            type="button"
            className="button button--secondary"
            onClick={() => navigate(`/ads/${id}`)}
          >
            {isRu ? 'Отменить' : 'Cancel'}
          </button>
        </div>
      </form>
    </section>
  )
}
