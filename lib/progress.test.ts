import { describe, it, expect } from 'vitest'
import { normalizeProgress, createEmptyProgress } from '@/lib/progress'

describe('normalizeProgress', () => {
  it('returns empty for non-object input', () => {
    expect(normalizeProgress(null, 5)).toEqual(createEmptyProgress())
    expect(normalizeProgress('x', 5)).toEqual(createEmptyProgress())
  })

  it('clamps currentIndex to [0, total]', () => {
    expect(normalizeProgress({ currentIndex: 10 }, 5).currentIndex).toBe(5)
    expect(normalizeProgress({ currentIndex: -3 }, 5).currentIndex).toBe(0)
  })

  it('keeps valid answers and wrongIds', () => {
    const p = normalizeProgress(
      {
        currentIndex: 1,
        answers: {
          g: { questionId: 'g', type: 'single', value: 'A', correct: false },
        },
        wrongIds: ['x'],
      },
      5,
    )
    expect(Object.keys(p.answers)).toEqual(['g'])
    expect(p.wrongIds).toEqual(['x'])
  })

  it('drops malformed answers and non-string wrongIds', () => {
    const p = normalizeProgress(
      {
        currentIndex: 1,
        answers: {
          bad: { foo: 1 } as never,
          good: { questionId: 'g', type: 'single', value: 'A', correct: false },
        },
        wrongIds: ['ok', 5 as never, null as never],
      },
      5,
    )
    expect(Object.keys(p.answers)).toEqual(['good'])
    expect(p.wrongIds).toEqual(['ok'])
  })
})
