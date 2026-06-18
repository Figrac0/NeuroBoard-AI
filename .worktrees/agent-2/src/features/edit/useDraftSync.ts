import { useEffect, useMemo, useState } from 'react'
import type { UseFormReturn } from 'react-hook-form'

import { createItemFormSchema, sanitizeFormValues } from '@/lib/forms'
import { removeStorage, readStorage, writeStorage } from '@/lib/storage'
import type { ItemFormValues } from '@/types/items'

interface UseDraftSyncOptions {
  itemId: string
  baselineValues: ItemFormValues | null
  form: UseFormReturn<ItemFormValues>
}

export function useDraftSync({ itemId, baselineValues, form }: UseDraftSyncOptions) {
  const [dismissedDraftKey, setDismissedDraftKey] = useState<string | null>(null)
  const storageKey = useMemo(() => `avito-ai-draft:${itemId}`, [itemId])
  const baselineSnapshot = useMemo(
    () => (baselineValues ? JSON.stringify(sanitizeFormValues(baselineValues)) : ''),
    [baselineValues],
  )

  const pendingDraft = useMemo(() => {
    if (!baselineValues || dismissedDraftKey === storageKey) {
      return null
    }

    const storedDraft = readStorage<unknown>(storageKey)

    if (!storedDraft) {
      return null
    }

    const parsedDraft = createItemFormSchema().safeParse(storedDraft)

    if (!parsedDraft.success) {
      removeStorage(storageKey)
      return null
    }

    const sanitizedDraft = sanitizeFormValues(parsedDraft.data)
    const draftSnapshot = JSON.stringify(sanitizedDraft)

    if (draftSnapshot === baselineSnapshot) {
      removeStorage(storageKey)
      return null
    }

    return sanitizedDraft
  }, [baselineSnapshot, baselineValues, dismissedDraftKey, storageKey])

  useEffect(() => {
    if (!baselineValues) {
      return
    }

    let timeoutId = 0
    const subscription = form.watch((values) => {
      window.clearTimeout(timeoutId)
      timeoutId = window.setTimeout(() => {
        const sanitizedValues = sanitizeFormValues(values)
        const snapshot = JSON.stringify(sanitizedValues)

        if (snapshot === baselineSnapshot) {
          removeStorage(storageKey)
          return
        }

        writeStorage(storageKey, sanitizedValues)
      }, 300)
    })

    return () => {
      subscription.unsubscribe()
      window.clearTimeout(timeoutId)
    }
  }, [baselineSnapshot, baselineValues, form, storageKey])

  return {
    pendingDraft,
    restoreDraft: () => {
      if (!pendingDraft) {
        return
      }

      form.reset(pendingDraft)
      setDismissedDraftKey(storageKey)
    },
    discardDraft: () => {
      removeStorage(storageKey)
      setDismissedDraftKey(storageKey)
    },
    clearDraft: () => removeStorage(storageKey),
  }
}
