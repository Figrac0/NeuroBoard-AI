import { Icon } from '@/components/Icon'
import { SelectField } from '@/components/SelectField'
import { getSortOptions } from '@/lib/item-config'
import { useLanguageStore } from '@/stores/languageStore'
import type { AdsLayout, SortOption } from '@/types/items'

interface AdsToolbarProps {
  searchValue: string
  sortBy: SortOption
  layout: AdsLayout
  onSearchChange: (value: string) => void
  onSortChange: (value: SortOption) => void
  onLayoutChange: (value: AdsLayout) => void
}

export function AdsToolbar({
  searchValue,
  sortBy,
  layout,
  onSearchChange,
  onSortChange,
  onLayoutChange,
}: AdsToolbarProps) {
  const language = useLanguageStore((store) => store.language)
  const isRu = language === 'ru'

  return (
    <div className="ads-toolbar">
      <label className="search-input">
        <span className="sr-only">{isRu ? 'Поиск по объявлениям' : 'Search listings'}</span>
        <input
          type="search"
          value={searchValue}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder={isRu ? 'Найти объявление...' : 'Search listings...'}
        />
        <Icon name="search" />
      </label>

      <div className="ads-toolbar__actions">
        <div
          className="layout-switcher"
          role="group"
          aria-label={isRu ? 'Выбор режима отображения' : 'Choose layout mode'}
        >
          <button
            type="button"
            className={
              layout === 'grid' ? 'layout-switcher__button is-active' : 'layout-switcher__button'
            }
            onClick={() => onLayoutChange('grid')}
            aria-pressed={layout === 'grid'}
            aria-label={isRu ? 'Показать сеткой' : 'Show as grid'}
          >
            <Icon name="grid" />
          </button>
          <button
            type="button"
            className={
              layout === 'list'
                ? 'layout-switcher__button layout-switcher__button--list is-active'
                : 'layout-switcher__button layout-switcher__button--list'
            }
            onClick={() => onLayoutChange('list')}
            aria-pressed={layout === 'list'}
            aria-label={isRu ? 'Показать списком' : 'Show as list'}
          >
            <Icon name="list" />
          </button>
        </div>

        <SelectField
          value={sortBy}
          options={getSortOptions(language)}
          className="select-field--toolbar"
          onChange={(value) => onSortChange(value as SortOption)}
        />
      </div>
    </div>
  )
}
