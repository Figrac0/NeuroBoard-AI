import { Icon } from '@/components/Icon'
import { useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'

export function ThemeToggle() {
  const { theme, toggleTheme } = useThemeStore()
  const language = useLanguageStore((store) => store.language)

  const isRu = language === 'ru'

  return (
    <button
      type="button"
      className="icon-button"
      onClick={toggleTheme}
      aria-label={
        theme === 'light'
          ? isRu
            ? 'Включить тёмную тему'
            : 'Switch to dark theme'
          : isRu
            ? 'Включить светлую тему'
            : 'Switch to light theme'
      }
      title={
        theme === 'light'
          ? isRu
            ? 'Тёмная тема'
            : 'Dark theme'
          : isRu
            ? 'Светлая тема'
            : 'Light theme'
      }
    >
      <Icon name={theme === 'light' ? 'moon' : 'sun'} />
    </button>
  )
}
