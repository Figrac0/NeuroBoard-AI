import clsx from 'clsx'
import { Link } from 'react-router-dom'

import { PlaceholderImage } from '@/components/PlaceholderImage'
import { formatPrice } from '@/lib/format'
import { getCategoryLabel } from '@/lib/item-config'
import { useLanguageStore } from '@/stores/languageStore'
import type { AdsLayout, Item } from '@/types/items'

interface AdCardProps {
  item: Item
  layout: AdsLayout
  animationIndex?: number
}

export function AdCard({ item, layout, animationIndex = 0 }: AdCardProps) {
  const language = useLanguageStore((store) => store.language)

  return (
    <Link
      to={`/ads/${item.id}`}
      className={clsx('ad-card', layout === 'list' && 'ad-card--list')}
      style={{ animationDelay: `${Math.min(animationIndex, 9) * 28}ms` }}
    >
      <div className="ad-card__media">
        <PlaceholderImage src={item.images[0]} alt={item.title} compact={layout === 'list'} />
      </div>

      <div className="ad-card__body">
        <span className="badge badge--ghost">{getCategoryLabel(item.category, language)}</span>
        <h3 className="ad-card__title">{item.title}</h3>
        <p className="ad-card__price">{formatPrice(item.price, language)}</p>

        {item.needsRevision ? (
          <span className="badge badge--warning">
            {language === 'ru' ? 'Требует доработок' : 'Needs revision'}
          </span>
        ) : (
          <span className="ad-card__spacer" aria-hidden="true" />
        )}
      </div>
    </Link>
  )
}
