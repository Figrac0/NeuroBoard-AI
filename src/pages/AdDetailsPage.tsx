import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState } from '@/components/ErrorState'
import { Icon } from '@/components/Icon'
import { LoadingState } from '@/components/LoadingState'
import { PlaceholderImage } from '@/components/PlaceholderImage'
import { StatusBanner } from '@/components/StatusBanner'
import { RevisionChecklist } from '@/features/ads/RevisionChecklist'
import { formatDateTime, formatPrice } from '@/lib/format'
import { getFilledCharacteristicEntries, getMissingFieldLabels } from '@/lib/revision'
import { getItemById } from '@/services/items'
import { useLanguageStore } from '@/stores/languageStore'

export function AdDetailsPage() {
  const { id = '' } = useParams()
  const language = useLanguageStore((store) => store.language)
  const isRu = language === 'ru'
  const [selectedImageIndex, setSelectedImageIndex] = useState(0)

  const itemQuery = useQuery({
    queryKey: ['item', id],
    queryFn: ({ signal }) => getItemById(id, signal),
  })

  const selectedImage = itemQuery.data?.images[selectedImageIndex]
  const characteristics = useMemo(
    () => (itemQuery.data ? getFilledCharacteristicEntries(itemQuery.data, language) : []),
    [itemQuery.data, language],
  )
  const missingFields = useMemo(
    () => (itemQuery.data ? getMissingFieldLabels(itemQuery.data, language) : []),
    [itemQuery.data, language],
  )

  if (itemQuery.isLoading) {
    return (
      <LoadingState
        title={isRu ? 'Загружаем карточку объявления' : 'Loading listing card'}
        description={
          isRu
            ? 'Собираем характеристики, изображения и описание.'
            : 'Collecting attributes, images, and description.'
        }
      />
    )
  }

  if (itemQuery.isError || !itemQuery.data) {
    return (
      <ErrorState
        description={
          isRu
            ? 'Не удалось открыть карточку объявления. Возможно, сервер недоступен или объявление не найдено.'
            : 'Could not open the listing card. The server may be unavailable or the listing was not found.'
        }
        onRetry={() => void itemQuery.refetch()}
      />
    )
  }

  const item = itemQuery.data

  return (
    <section className="page-stack page-stack--details">
      <Link to="/ads" className="back-link">
        <span className="back-link__icon">
          <Icon name="arrow-left" />
        </span>
        <span className="back-link__text">{isRu ? 'К списку объявлений' : 'Back to listings'}</span>
      </Link>

      <header className="details-header">
        <div className="details-header__title-block">
          <h1>{item.title}</h1>
          <div className="details-header__actions">
            <Link to={`/ads/${item.id}/edit`} className="button button--primary">
              {isRu ? 'Редактировать' : 'Edit'}
              <Icon name="edit" />
            </Link>
          </div>
        </div>

        <div className="details-header__meta-card">
          <p className="details-header__price">{formatPrice(item.price, language)}</p>
          <div className="details-header__dates">
            <p className="page-subtitle">
              {isRu ? 'Опубликовано' : 'Published'}: {formatDateTime(item.createdAt, language)}
            </p>
            {item.updatedAt && item.updatedAt !== item.createdAt ? (
              <p className="page-subtitle">
                {isRu ? 'Отредактировано' : 'Updated'}: {formatDateTime(item.updatedAt, language)}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <div className="details-divider" />

      <section className="details-overview">
        <div className="details-overview__media">
          <div className="details-media">
            <PlaceholderImage src={selectedImage} alt={item.title} />
          </div>

          {item.images.length > 1 ? (
            <div className="thumbnail-row">
              {item.images.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  className={
                    index === selectedImageIndex
                      ? 'thumbnail-row__button is-active'
                      : 'thumbnail-row__button'
                  }
                  onClick={() => setSelectedImageIndex(index)}
                >
                  <PlaceholderImage src={image} alt={`${item.title} ${index + 1}`} compact />
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="details-overview__side">
          {missingFields.length ? (
            <StatusBanner
              tone="warning"
              title={isRu ? 'Требуются доработки' : 'Needs revision'}
              description={
                isRu ? 'У объявления не заполнены поля:' : 'The following fields are still missing:'
              }
            >
              <RevisionChecklist items={missingFields} />
            </StatusBanner>
          ) : null}

          <section className="details-panel">
            <h2>{isRu ? 'Характеристики' : 'Attributes'}</h2>

            {characteristics.length ? (
              <dl className="characteristics-list">
                {characteristics.map((entry) => (
                  <div key={entry.label} className="characteristics-list__row">
                    <dt>{entry.label}</dt>
                    <dd>{entry.value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="muted-text">
                {isRu ? 'Характеристики пока не заполнены.' : 'Attributes are not filled in yet.'}
              </p>
            )}
          </section>
        </div>

        <section className="details-description">
          <h2>{isRu ? 'Описание' : 'Description'}</h2>
          <p className="description-text">
            {item.description.trim() ||
              (isRu ? 'Описание отсутствует.' : 'Description is missing.')}
          </p>
        </section>
      </section>
    </section>
  )
}
