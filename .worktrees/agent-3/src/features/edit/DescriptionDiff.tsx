import type { ReactNode } from 'react'

import { buildWordDiff } from '@/lib/diff'
import { useLanguageStore } from '@/stores/languageStore'

interface DescriptionDiffProps {
  before: string
  after: string
}

function renderPreview(type: 'before' | 'after', before: string, after: string): ReactNode {
  const diff = buildWordDiff(before, after)

  if (!diff.length) {
    return <p className="diff-card__text">{type === 'before' ? before : after}</p>
  }

  return (
    <p className="diff-card__text">
      {diff.map((part, index) => {
        if (type === 'before' && part.type === 'added') {
          return null
        }

        if (type === 'after' && part.type === 'removed') {
          return null
        }

        return (
          <span
            key={`${part.type}-${index}`}
            className={
              part.type === 'same'
                ? undefined
                : part.type === 'added'
                  ? 'diff-card__chunk diff-card__chunk--added'
                  : 'diff-card__chunk diff-card__chunk--removed'
            }
          >
            {part.text}{' '}
          </span>
        )
      })}
    </p>
  )
}

export function DescriptionDiff({ before, after }: DescriptionDiffProps) {
  const language = useLanguageStore((store) => store.language)

  return (
    <div className="diff-grid">
      <section className="diff-card">
        <p className="diff-card__label">{language === 'ru' ? 'Было' : 'Before'}</p>
        {renderPreview('before', before, after)}
      </section>
      <section className="diff-card">
        <p className="diff-card__label">{language === 'ru' ? 'Стало' : 'After'}</p>
        {renderPreview('after', before, after)}
      </section>
    </div>
  )
}
