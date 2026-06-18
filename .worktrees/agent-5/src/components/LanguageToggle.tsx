import clsx from 'clsx'

import { useLanguageStore } from '@/stores/languageStore'

export function LanguageToggle() {
  const { language, setLanguage } = useLanguageStore()

  return (
    <div className="language-toggle" role="group" aria-label="Language switch">
      <button
        type="button"
        className={clsx('language-toggle__button', language === 'ru' && 'is-active')}
        onClick={() => setLanguage('ru')}
        aria-pressed={language === 'ru'}
      >
        RU
      </button>
      <button
        type="button"
        className={clsx('language-toggle__button', language === 'en' && 'is-active')}
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
      >
        EN
      </button>
    </div>
  )
}
