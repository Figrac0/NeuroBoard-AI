import { useLanguageStore } from '@/stores/languageStore'

interface ErrorStateProps {
  title?: string
  description: string
  actionLabel?: string
  onRetry?: () => void
}

export function ErrorState({ title, description, actionLabel, onRetry }: ErrorStateProps) {
  const language = useLanguageStore((store) => store.language)

  return (
    <section className="empty-state empty-state--error">
      <h2>
        {title || (language === 'ru' ? 'Не удалось загрузить данные' : 'Failed to load data')}
      </h2>
      <p>{description}</p>
      {onRetry ? (
        <button type="button" className="button button--secondary" onClick={onRetry}>
          {actionLabel || (language === 'ru' ? 'Попробовать снова' : 'Try again')}
        </button>
      ) : null}
    </section>
  )
}
