import { useState } from 'react'

import { Icon } from '@/components/Icon'
import { getCategoryLabel } from '@/lib/item-config'
import { useLanguageStore } from '@/stores/languageStore'
import type { Category } from '@/types/items'

interface AdsFiltersProps {
  categories: Category[]
  needsRevisionOnly: boolean
  onToggleCategory: (category: Category) => void
  onToggleNeedsRevision: () => void
  onReset: () => void
}

const CATEGORY_ORDER: Category[] = ['auto', 'electronics', 'real_estate']

export function AdsFilters({
  categories,
  needsRevisionOnly,
  onToggleCategory,
  onToggleNeedsRevision,
  onReset,
}: AdsFiltersProps) {
  const language = useLanguageStore((store) => store.language)
  const isRu = language === 'ru'
  const [isCategoryOpen, setIsCategoryOpen] = useState(true)

  return (
    <aside className="filters-column">
      <div className="filters-panel">
        <div className="filters-panel__section">
          <h2 className="filters-panel__title">{isRu ? 'Фильтры' : 'Filters'}</h2>

          <div className="filters-panel__group">
            <button
              type="button"
              className="filters-panel__group-header"
              onClick={() => setIsCategoryOpen((current) => !current)}
              aria-expanded={isCategoryOpen}
            >
              <span>{isRu ? 'Категория' : 'Category'}</span>
              <Icon
                name="chevron-down"
                className={
                  isCategoryOpen ? 'filters-panel__chevron is-open' : 'filters-panel__chevron'
                }
              />
            </button>

            {isCategoryOpen ? (
              <div className="checkbox-list">
                {CATEGORY_ORDER.map((category) => (
                  <label key={category} className="checkbox">
                    <input
                      type="checkbox"
                      checked={categories.includes(category)}
                      onChange={() => onToggleCategory(category)}
                    />
                    <span className="checkbox__mark" aria-hidden="true" />
                    <span>{getCategoryLabel(category, language)}</span>
                  </label>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="filters-panel__divider" />

        <div className="toggle-row">
          <p className="toggle-row__title">
            {isRu ? 'Только требующие доработок' : 'Only listings needing revision'}
          </p>

          <button
            type="button"
            className={`toggle ${needsRevisionOnly ? 'toggle--active' : ''}`}
            onClick={onToggleNeedsRevision}
            aria-pressed={needsRevisionOnly}
            aria-label={
              isRu
                ? 'Показывать только объявления, которым нужны доработки'
                : 'Show only listings that need revision'
            }
          >
            <span className="toggle__thumb" />
          </button>
        </div>
      </div>

      <button
        type="button"
        className="button button--secondary button--block filters-panel__reset"
        onClick={onReset}
      >
        {isRu ? 'Сбросить фильтры' : 'Reset filters'}
      </button>
    </aside>
  )
}
