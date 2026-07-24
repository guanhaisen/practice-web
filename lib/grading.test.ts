import { describe, it, expect } from 'vitest'
import { grade } from '@/lib/grading'
import type { Question } from '@/lib/questions'

const base = (over: Partial<Question>): Question => ({
  id: 'q',
  type: 'single',
  subject: 'math-1',
  stem: 's',
  answer: 'A',
  ...over,
})

describe('grade', () => {
  it('single/judge compares value to answer', () => {
    expect(grade('single', 'A', base({ answer: 'A' }))).toBe(true)
    expect(grade('single', 'B', base({ answer: 'A' }))).toBe(false)
    expect(grade('judge', '正确', base({ type: 'judge', answer: '正确' }))).toBe(true)
  })

  it('multiple ignores order but checks length', () => {
    const q = base({ type: 'multiple', answer: ['A', 'B'] })
    expect(grade('multiple', ['B', 'A'], q)).toBe(true)
    expect(grade('multiple', ['A'], q)).toBe(false)
    expect(grade('multiple', ['A', 'B', 'C'], q)).toBe(false)
  })

  it('fill is self-graded (returns null)', () => {
    expect(grade('fill', 'anything', base({ type: 'fill', answer: ['x'] }))).toBeNull()
  })
})
