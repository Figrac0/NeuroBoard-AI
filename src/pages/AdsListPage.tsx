import { useQuery } from '@tanstack/react-query'
import { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { LoadingState } from '@/components/LoadingState'
import { Pagination } from '@/components/Pagination'
import { AdCard } from '@/features/ads/AdCard'
import { AdsFilters } from '@/features/ads/AdsFilters'
import { AdsToolbar } from '@/features/ads/AdsToolbar'
import { pluralizeAds } from '@/lib/format'
import { getAllItems, getItemsTotal } from '@/services/items'
import { useLanguageStore } from '@/stores/languageStore'
import type { AdsLayout, Category, Item, SortOption } from '@/types/items'

const PAGE_SIZE = 10

function parseCategories(rawValue: string | null): Category[] {
  if (!rawValue) {
    return []
  }

  return rawValue
    .split(',')
    .map((value) => value.trim())
    .filter(
      (value): value is Category =>
        value === 'auto' || value === 'real_estate' || value === 'electronics',
    )
}

function sortItems(items: Item[], sortBy: SortOption): Item[] {
  const copiedItems = [...items]

  copiedItems.sort((left, right) => {
    switch (sortBy) {
      case 'createdAt-asc':
      case 'createdAt-desc': {
        const leftDate = left.createdAt ? new Date(left.createdAt).getTime() : 0
        const rightDate = right.createdAt ? new Date(right.createdAt).getTime() : 0
        return sortBy === 'createdAt-desc' ? rightDate - leftDate : leftDate - rightDate
      }
      case 'price-asc':
        return left.price - right.price
      case 'price-desc':
        return right.price - left.price
      case 'title-desc':
        return right.title.localeCompare(left.title, 'ru')
      case 'title-asc':
      default:
        return left.title.localeCompare(right.title, 'ru')
    }
  })

  return copiedItems
}

export function AdsListPage() {
  const language = useLanguageStore((store) => store.language)
  const isRu = language === 'ru'
  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const categories = parseCategories(searchParams.get('categories'))
  const needsRevisionOnly = searchParams.get('needsRevision') === 'true'
  const layout = (searchParams.get('layout') as AdsLayout) === 'list' ? 'list' : 'grid'
  const page = Math.max(1, Number(searchParams.get('page') || '1'))
  const sortBy = (searchParams.get('sort') as SortOption) || 'createdAt-desc'

  const [searchValue, setSearchValue] = useState(query)
  const deferredSearchValue = useDeferredValue(searchValue)

  useEffect(() => {
    setSearchValue(query)
  }, [query])

  const updateParams = useCallback(
    (patch: Record<string, string | undefined>) => {
      startTransition(() => {
        setSearchParams((currentParams) => {
          const nextParams = new URLSearchParams(currentParams)

          Object.entries(patch).forEach(([key, value]) => {
            if (!value) {
              nextParams.delete(key)
            } else {
              nextParams.set(key, value)
            }
          })

          return nextParams
        })
      })
    },
    [setSearchParams],
  )

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (deferredSearchValue === query) {
        return
      }

      updateParams({
        q: deferredSearchValue || undefined,
        page: '1',
      })
    }, 350)

    return () => window.clearTimeout(timeoutId)
  }, [deferredSearchValue, query, updateParams])

  const itemsQuery = useQuery({
    queryKey: ['items', query, categories.join(','), needsRevisionOnly, sortBy],
    queryFn: ({ signal }) =>
      getAllItems(
        {
          query,
          categories,
        },
        signal,
      ),
  })

  const totalItemsQuery = useQuery({
    queryKey: ['items-total'],
    queryFn: ({ signal }) => getItemsTotal(signal),
  })

  const fetchedItems = itemsQuery.data ?? []
  const filteredItems = needsRevisionOnly
    ? fetchedItems.filter((item) => item.needsRevision)
    : fetchedItems
  const sortedItems = sortItems(filteredItems, sortBy)
  const totalPages = Math.max(1, Math.ceil(sortedItems.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedItems = sortedItems.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    if (safePage !== page) {
      updateParams({ page: String(safePage) })
    }
  }, [page, safePage, updateParams])

  const toggleCategory = (category: Category) => {
    const nextCategories = categories.includes(category)
      ? categories.filter((item) => item !== category)
      : [...categories, category]

    updateParams({
      categories: nextCategories.length ? nextCategories.join(',') : undefined,
      page: '1',
    })
  }

  const resetFilters = () => {
    setSearchValue('')
    updateParams({
      q: undefined,
      categories: undefined,
      needsRevision: undefined,
      sort: 'createdAt-desc',
      page: '1',
    })
  }

  const resultsMotionKey = useMemo(
    () =>
      [
        layout,
        sortBy,
        safePage,
        query,
        categories.join('-'),
        needsRevisionOnly ? 'revision' : 'all',
      ].join(':'),
    [categories, layout, needsRevisionOnly, query, safePage, sortBy],
  )

  return (
    <section className="page-stack page-stack--ads">
      <header className="page-header">
        <div>
          <h1>{isRu ? 'Мои объявления' : 'My listings'}</h1>
          <p className="page-subtitle">
            {totalItemsQuery.data ?? 0} {pluralizeAds(totalItemsQuery.data ?? 0, language)}
          </p>
        </div>
      </header>

      <AdsToolbar
        searchValue={searchValue}
        sortBy={sortBy}
        layout={layout}
        onSearchChange={setSearchValue}
        onSortChange={(value) => updateParams({ sort: value, page: '1' })}
        onLayoutChange={(value) => updateParams({ layout: value })}
      />

      <div className="ads-layout">
        <AdsFilters
          categories={categories}
          needsRevisionOnly={needsRevisionOnly}
          onToggleCategory={toggleCategory}
          onToggleNeedsRevision={() =>
            updateParams({
              needsRevision: needsRevisionOnly ? undefined : 'true',
              page: '1',
            })
          }
          onReset={resetFilters}
        />

        <div className="ads-content">
          {itemsQuery.isLoading ? (
            <LoadingState />
          ) : itemsQuery.isError ? (
            <ErrorState
              description={
                isRu
                  ? 'Не получилось загрузить список объявлений. Проверьте backend и попробуйте ещё раз.'
                  : 'Could not load the listings. Check the backend and try again.'
              }
              onRetry={() => void itemsQuery.refetch()}
            />
          ) : pagedItems.length ? (
            <>
              <div
                key={resultsMotionKey}
                className={`ads-results-shell ads-results-shell--${layout}`}
              >
                <div className={`ads-grid ads-grid--${layout}`}>
                  {pagedItems.map((item, index) => (
                    <AdCard key={item.id} item={item} layout={layout} animationIndex={index} />
                  ))}
                </div>
              </div>

              <Pagination
                page={safePage}
                totalPages={totalPages}
                onPageChange={(nextPage) => updateParams({ page: String(nextPage) })}
              />
            </>
          ) : (
            <EmptyState
              title={isRu ? 'Ничего не найдено' : 'Nothing found'}
              description={
                isRu
                  ? 'Попробуйте изменить поисковую строку или сбросить фильтры.'
                  : 'Try changing the search query or resetting the filters.'
              }
              actionLabel={isRu ? 'Сбросить фильтры' : 'Reset filters'}
              onAction={resetFilters}
            />
          )}
        </div>
      </div>
    </section>
  )
}
