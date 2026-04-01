import { describe, expect, it } from 'vitest'

import { buildWordDiff } from '@/lib/diff'

describe('buildWordDiff', () => {
  it('marks added and removed tokens between two texts', () => {
    const diff = buildWordDiff(
      'Продам MacBook Pro в хорошем состоянии',
      'Продам MacBook Pro 16 в отличном состоянии',
    )

    expect(diff).toEqual(
      expect.arrayContaining([
        { type: 'same', text: 'Продам MacBook Pro' },
        { type: 'added', text: '16' },
        { type: 'removed', text: 'хорошем' },
        { type: 'added', text: 'отличном' },
        { type: 'same', text: 'состоянии' },
      ]),
    )
  })

  it('returns only additions when original text is empty', () => {
    const diff = buildWordDiff('', 'Новый текст описания')

    expect(diff).toEqual([{ type: 'added', text: 'Новый текст описания' }])
  })
})
