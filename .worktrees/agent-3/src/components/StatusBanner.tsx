import type { ReactNode } from 'react'
import clsx from 'clsx'

import { Icon } from '@/components/Icon'

interface StatusBannerProps {
  title: string
  description?: string
  tone?: 'warning' | 'success' | 'error' | 'info'
  children?: ReactNode
  className?: string
}

export function StatusBanner({
  title,
  description,
  tone = 'info',
  children,
  className,
}: StatusBannerProps) {
  return (
    <section className={clsx('status-banner', `status-banner--${tone}`, className)}>
      <div className="status-banner__icon">
        <Icon
          name={
            tone === 'success'
              ? 'check'
              : tone === 'error' || tone === 'warning'
                ? 'warning'
                : 'sparkles'
          }
        />
      </div>
      <div className="status-banner__body">
        <p className="status-banner__title">{title}</p>
        {description ? <p className="status-banner__description">{description}</p> : null}
        {children}
      </div>
    </section>
  )
}
