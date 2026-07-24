import { describe, it, expect, beforeEach } from 'vitest'
import {
  validateBank,
  loadBank,
  saveBank,
  mergeBank,
} from '@/lib/bank'
import { parseBackup } from '@/lib/backup'
import type { Question } from '@/lib/questions'

class MemStorage {
  private m = new Map<string, string>()
  getItem(k: string) {
    return this.m.has(k) ? (this.m.get(k) as string) : null
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v))
  }
  removeItem(k: string) {
    this.m.delete(k)
  }
  clear() {
    this.m.clear()
  }
  key(i: number) {
    return Array.from(this.m.keys())[i] ?? null
  }
  get length() {
    return this.m.size
  }
}

const singleQ = (id: string, subject: string): Question => ({
  id,
  type: 'single',
  subject,
  stem: 's',
  answer: 'A',
  options: ['A', 'B'],
})

beforeEach(() => {
  ;(global as unknown as { localStorage: MemStorage }).localStorage =
    new MemStorage()
})

describe('validateBank', () => {
  it('accepts well-formed questions', () => {
    const r = validateBank([singleQ('a', 'math-1')])
    expect(r.ok).toBe(true)
    expect(r.questions).toHaveLength(1)
  })

  it('rejects bad type / answer shape / subject', () => {
    expect(
      validateBank([{ ...singleQ('a', 'math-1'), type: 'weird' }]).ok,
    ).toBe(false)
    expect(
      validateBank([{ ...singleQ('a', 'math-1'), answer: ['A'] }]).ok,
    ).toBe(false)
    expect(validateBank([singleQ('a', 'unknown-subject')]).ok).toBe(false)
  })
})

describe('mergeBank + pruneOrphans', () => {
  it('overwrites only the involved subject and prunes orphaned wrongIds', () => {
    saveBank([singleQ('old1', 'math-1'), singleQ('old2', 'english-1')])
    ;(global as unknown as { localStorage: MemStorage }).localStorage.setItem(
      'quiz-progress-v1:math-1',
      JSON.stringify({ currentIndex: 0, answers: {}, wrongIds: ['ghost-id'] }),
    )
    mergeBank([singleQ('new1', 'math-1')])
    const bank = loadBank()
    expect(bank.map((q) => q.id)).toEqual(['old2', 'new1'])
    const p = JSON.parse(
      (global as unknown as { localStorage: MemStorage }).localStorage.getItem(
        'quiz-progress-v1:math-1',
      ) as string,
    )
    expect(p.wrongIds).toEqual([])
  })
})

describe('parseBackup', () => {
  it('throws on malformed input', () => {
    expect(() => parseBackup(null)).toThrow()
    expect(() => parseBackup({ foo: 1 })).toThrow()
    expect(() => parseBackup({ version: 1, bank: 'x' })).toThrow()
  })

  it('returns a Backup for valid input', () => {
    const b = parseBackup({
      version: 1,
      bank: [singleQ('a', 'math-1')],
      flags: ['f'],
    })
    expect(b.bank).toHaveLength(1)
    expect(b.flags).toEqual(['f'])
  })
})
