import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import type { Language } from '@/types/items'

interface LanguageStore {
  language: Language
  setLanguage: (language: Language) => void
  toggleLanguage: () => void
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      language: 'ru',
      setLanguage: (language) => set({ language }),
      toggleLanguage: () =>
        set((state) => ({
          language: state.language === 'ru' ? 'en' : 'ru',
        })),
    }),
    {
      name: 'avito-ai-language',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)
