import { useEffect, useId, useRef, useState } from 'react'

import { Icon } from '@/components/Icon'

export interface CustomSelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  value?: string
  options: CustomSelectOption[]
  placeholder?: string
  onChange: (value: string) => void
  disabled?: boolean
  allowClear?: boolean
}

export function CustomSelect({
  value,
  options,
  placeholder = 'Не выбрано',
  onChange,
  disabled = false,
  allowClear = false,
}: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const listboxId = useId()

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const selectedOption = options.find((option) => option.value === value)

  return (
    <div
      ref={rootRef}
      className={`custom-select ${isOpen ? 'custom-select--open' : ''} ${disabled ? 'custom-select--disabled' : ''}`}
    >
      <button
        type="button"
        className="custom-select__trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        onClick={() => !disabled && setIsOpen((currentValue) => !currentValue)}
        disabled={disabled}
      >
        <span className={selectedOption ? 'custom-select__value' : 'custom-select__placeholder'}>
          {selectedOption?.label || placeholder}
        </span>
        <span className="custom-select__actions">
          {allowClear && value ? (
            <span
              className="custom-select__clear"
              onClick={(event) => {
                event.stopPropagation()
                onChange('')
                setIsOpen(false)
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onChange('')
                  setIsOpen(false)
                }
              }}
            >
              <Icon name="close" />
            </span>
          ) : null}
          <Icon name="chevron-down" className="custom-select__chevron" />
        </span>
      </button>

      {isOpen ? (
        <div className="custom-select__dropdown" role="listbox" id={listboxId}>
          <button
            type="button"
            className={`custom-select__option ${!value ? 'is-selected' : ''}`}
            onClick={() => {
              onChange('')
              setIsOpen(false)
            }}
          >
            {placeholder}
          </button>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`custom-select__option ${option.value === value ? 'is-selected' : ''}`}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
