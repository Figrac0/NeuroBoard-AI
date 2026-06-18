import type { PropsWithChildren, ReactNode } from 'react'

interface FormFieldProps extends PropsWithChildren {
  label: string
  htmlFor: string
  required?: boolean
  error?: string
  hint?: string
  action?: ReactNode
}

export function FormField({
  label,
  htmlFor,
  required = false,
  error,
  hint,
  action,
  children,
}: FormFieldProps) {
  return (
    <div className="form-field">
      <span className="form-field__header">
        <label className="form-field__label" htmlFor={htmlFor}>
          {required ? <span className="form-field__required">*</span> : null}
          {label}
        </label>
        {action}
      </span>
      {children}
      {error ? <span className="form-field__error">{error}</span> : null}
      {!error && hint ? <span className="form-field__hint">{hint}</span> : null}
    </div>
  )
}
