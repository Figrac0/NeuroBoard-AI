import { useEffect } from 'react'

import { Icon } from '@/components/Icon'
import { useLanguageStore } from '@/stores/languageStore'
import { useToastStore } from '@/stores/toastStore'

function ToastItem(props: {
  id: string
  tone: 'success' | 'error' | 'info'
  title: string
  description?: string
}) {
  const dismissToast = useToastStore((store) => store.dismissToast)
  const language = useLanguageStore((store) => store.language)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => dismissToast(props.id), 4200)
    return () => window.clearTimeout(timeoutId)
  }, [dismissToast, props.id])

  return (
    <article className={`toast toast--${props.tone}`}>
      <div className="toast__icon">
        <Icon
          name={
            props.tone === 'success' ? 'check' : props.tone === 'error' ? 'warning' : 'sparkles'
          }
        />
      </div>
      <div className="toast__content">
        <p className="toast__title">{props.title}</p>
        {props.description ? <p className="toast__description">{props.description}</p> : null}
      </div>
      <button
        type="button"
        className="toast__close"
        onClick={() => dismissToast(props.id)}
        aria-label={language === 'ru' ? 'Закрыть уведомление' : 'Close notification'}
      >
        <Icon name="close" />
      </button>
    </article>
  )
}

export function ToastViewport() {
  const toasts = useToastStore((store) => store.toasts)

  if (!toasts.length) {
    return null
  }

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="true">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} {...toast} />
      ))}
    </div>
  )
}
