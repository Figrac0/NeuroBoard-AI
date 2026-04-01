import { useLanguageStore } from '@/stores/languageStore'

interface EmptyStateProps {
  title: string
  description: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const language = useLanguageStore((store) => store.language)

  return (
    <section className="empty-state">
      <h2>{title}</h2>
      <p>{description}</p>
      {actionLabel && onAction ? (
        <button type="button" className="button button--secondary" onClick={onAction}>
          {actionLabel || (language === 'ru' ? 'Продолжить' : 'Continue')}
        </button>
      ) : null}
    </section>
  )
}
