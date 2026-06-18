import clsx from 'clsx'
import { useRef, type InputHTMLAttributes } from 'react'

import { Icon } from '@/components/Icon'
import { useLanguageStore } from '@/stores/languageStore'

interface ClearableInputProps {
  id?: string
  value: string
  type?: 'text' | 'number' | 'search'
  placeholder?: string
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  className?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function ClearableInput({
  id,
  value,
  type = 'text',
  placeholder,
  inputMode,
  className,
  disabled = false,
  onChange,
}: ClearableInputProps) {
  const language = useLanguageStore((store) => store.language)
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <div className={clsx('input-shell', className)}>
      <input
        ref={inputRef}
        id={id}
        className="input input-shell__control"
        type={type}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />

      {value ? (
        <button
          type="button"
          className="input-shell__clear"
          aria-label={language === 'ru' ? 'Очистить поле' : 'Clear field'}
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
        >
          <Icon name="close" />
        </button>
      ) : null}
    </div>
  )
}
