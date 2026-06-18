import { Link } from 'react-router-dom'

import { useLanguageStore } from '@/stores/languageStore'

export function NotFoundPage() {
  const language = useLanguageStore((store) => store.language)

  return (
    <section className="empty-state">
      <h1>{language === 'ru' ? 'Страница не найдена' : 'Page not found'}</h1>
      <p>
        {language === 'ru'
          ? 'Возможно, ссылка устарела или объявление было удалено.'
          : 'The link may be outdated or the listing may have been removed.'}
      </p>
      <Link to="/ads" className="button button--primary">
        {language === 'ru' ? 'Вернуться к списку' : 'Back to listings'}
      </Link>
    </section>
  )
}
