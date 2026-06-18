import clsx from 'clsx'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Icon } from '@/components/Icon'
import { useLanguageStore } from '@/stores/languageStore'

export interface SelectOption {
  value: string
  label: string
}

interface SelectFieldProps {
  id?: string
  value: string
  options: SelectOption[]
  placeholder?: string
  disabled?: boolean
  className?: string
  onChange: (value: string) => void
}

export function SelectField({
  id,
  value,
  options,
  placeholder,
  disabled = false,
  className,
  onChange,
}: SelectFieldProps) {
  const language = useLanguageStore((store) => store.language)
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const resolvedPlaceholder =
    placeholder || (language === 'ru' ? 'Выберите значение' : 'Select a value')

  const selectedOption = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  )

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  return (
    <div ref={rootRef} className={clsx('select-field', className, isOpen && 'select-field--open')}>
      <button
        id={id}
        type="button"
        className={clsx('select-trigger', !selectedOption && 'select-trigger--placeholder')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((currentValue) => !currentValue)}
      >
        <span className="select-trigger__label">
          {selectedOption?.label || resolvedPlaceholder}
        </span>
        <Icon name="chevron-down" className="select-trigger__icon" />
      </button>

      {isOpen ? (
        <div className="select-dropdown" role="listbox">
          {options.map((option) => {
            const isSelected = option.value === value

            return (
              <button
                key={option.value}
                type="button"
                className={clsx(
                  'select-dropdown__option',
                  isSelected && 'select-dropdown__option--selected',
                )}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
