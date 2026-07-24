import { describe, it, expect } from 'vitest'
import { parseCsv } from '@/lib/csv'

describe('parseCsv', () => {
  it('parses columns and | separated options/answers', () => {
    const r = parseCsv('q1,single,math-1,1+1,1|2|3,2,')
    expect(r.errors).toHaveLength(0)
    expect(r.questions).toHaveLength(1)
    const q = r.questions[0]
    expect(q.id).toBe('q1')
    expect(q.options).toEqual(['1', '2', '3'])
    expect(q.answer).toBe('2')
  })

  it('skips the header row', () => {
    const r = parseCsv(
      'id,type,subject,stem,options,answer,explanation\nq1,single,s,stem,,A,',
    )
    expect(r.questions).toHaveLength(1)
    expect(r.questions[0].id).toBe('q1')
  })

  it('reports missing required fields', () => {
    const r = parseCsv('q1,single,,stem,,A,')
    expect(r.errors.length).toBeGreaterThan(0)
  })

  it('splits multiple-choice answer into an array', () => {
    const r = parseCsv('q1,multiple,s,stem,a|b|c,a|b,')
    expect(r.questions[0].answer).toEqual(['a', 'b'])
  })
})
