import { useEffect, type PropsWithChildren } from 'react'
import { Link } from 'react-router-dom'

import mainLogo from '@/assets/mainlogo.png'
import { LanguageToggle } from '@/components/LanguageToggle'
import { ThemeToggle } from '@/components/ThemeToggle'
import { ToastViewport } from '@/components/ToastViewport'
import { useLanguageStore } from '@/stores/languageStore'
import { useThemeStore } from '@/stores/themeStore'

export function AppShell({ children }: PropsWithChildren) {
  const theme = useThemeStore((store) => store.theme)
  const language = useLanguageStore((store) => store.language)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    document.documentElement.lang = language
  }, [language, theme])

  return (
    <div className="app-shell">
      <header className="app-header">
        <Link to="/ads" className="app-header__brand">
          <img src={mainLogo} alt="" aria-hidden="true" className="app-header__logo" />
          <span className="app-header__title">NeuroBoard AI</span>
        </Link>

        <div className="app-header__actions">
          <LanguageToggle />
          <ThemeToggle />
        </div>
      </header>

      <main className="page-container">{children}</main>
      <ToastViewport />
    </div>
  )
}
