import { useState } from 'react'
import clsx from 'clsx'

interface PlaceholderImageProps {
  src?: string
  alt: string
  compact?: boolean
}

export function PlaceholderImage({ src, alt, compact = false }: PlaceholderImageProps) {
  const [hasError, setHasError] = useState(false)

  if (src && !hasError) {
    return (
      <img
        className={clsx('placeholder-image', compact && 'placeholder-image--compact')}
        src={src}
        alt={alt}
        onError={() => setHasError(true)}
      />
    )
  }

  return (
    <div
      className={clsx(
        'placeholder-image',
        'placeholder-image--empty',
        compact && 'placeholder-image--compact',
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 120 90" fill="none" stroke="currentColor" strokeWidth="4">
        <rect x="8" y="8" width="104" height="74" rx="8" />
        <circle cx="34" cy="30" r="8" fill="currentColor" stroke="none" />
        <path d="M20 70l24-26 16 16 18-24 22 34" />
      </svg>
    </div>
  )
}
