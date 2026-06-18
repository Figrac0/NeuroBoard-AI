import type { TextareaHTMLAttributes } from 'react'

import { Icon } from '@/components/Icon'

interface ClearableTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  showClear?: boolean
  onClear?: () => void
}

export function ClearableTextarea({
  showClear = false,
  onClear,
  className,
  ...props
}: ClearableTextareaProps) {
  return (
    <div className="input-shell input-shell--textarea">
      <textarea className={className || 'input input--textarea'} {...props} />
      {showClear && onClear ? (
        <button
          type="button"
          className="input-shell__clear"
          onClick={onClear}
          aria-label="Очистить поле"
        >
          <Icon name="close" />
        </button>
      ) : null}
    </div>
  )
}
