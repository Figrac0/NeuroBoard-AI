import { Controller, type UseFormReturn } from 'react-hook-form'

import { ClearableInput } from '@/components/ClearableInput'
import { FormField } from '@/components/FormField'
import { SelectField } from '@/components/SelectField'
import { getFieldConfig } from '@/lib/item-config'
import { useLanguageStore } from '@/stores/languageStore'
import type { Category, ItemFormValues } from '@/types/items'

interface DynamicParamFieldsProps {
  category: Category
  form: UseFormReturn<ItemFormValues>
}

export function DynamicParamFields({ category, form }: DynamicParamFieldsProps) {
  const language = useLanguageStore((store) => store.language)
  const fields = getFieldConfig(category, language)

  return (
    <div className="form-grid">
      {fields.map((field) => {
        const fieldName = `params.${field.key}` as const
        const fieldError = form.formState.errors.params?.[field.key]?.message
        const inputId = `field-${field.key}`

        return (
          <FormField
            key={field.key}
            label={field.label}
            htmlFor={inputId}
            error={typeof fieldError === 'string' ? fieldError : undefined}
          >
            <Controller
              control={form.control}
              name={fieldName}
              render={({ field: controllerField }) =>
                field.type === 'select' ? (
                  <SelectField
                    id={inputId}
                    value={controllerField.value ?? ''}
                    placeholder={language === 'ru' ? 'Не выбрано' : 'Not selected'}
                    options={field.options ?? []}
                    onChange={controllerField.onChange}
                  />
                ) : (
                  <ClearableInput
                    id={inputId}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={controllerField.value ?? ''}
                    placeholder={field.placeholder}
                    inputMode={field.type === 'number' ? 'numeric' : undefined}
                    onChange={controllerField.onChange}
                  />
                )
              }
            />
          </FormField>
        )
      })}
    </div>
  )
}
