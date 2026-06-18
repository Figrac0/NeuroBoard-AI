import { useLanguageStore } from '@/stores/languageStore'

interface LoadingStateProps {
  title?: string
  description?: string
}

export function LoadingState({ title, description }: LoadingStateProps) {
  const language = useLanguageStore((store) => store.language)

  return (
    <section className="empty-state">
      <div className="loading-spinner" aria-hidden="true" />
      <h2>{title || (language === 'ru' ? 'Загружаем объявления' : 'Loading listings')}</h2>
      <p>
        {description ||
          (language === 'ru'
            ? 'Подготавливаем данные и интерфейс.'
            : 'Preparing the data and interface.')}
      </p>
    </section>
  )
}
