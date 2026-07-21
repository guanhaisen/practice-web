import type { QuestionType } from './questions'

export interface UserAnswer {
  questionId: string
  type: QuestionType
  value: string | string[]
  correct: boolean | null
}

export interface Progress {
  currentIndex: number
  answers: Record<string, UserAnswer>
  wrongIds: string[]
  updatedAt: number
}

export const STORAGE_KEY = 'quiz-progress-v1'

export function createEmptyProgress(): Progress {
  return { currentIndex: 0, answers: {}, wrongIds: [], updatedAt: 0 }
}

export function isComplete(p: Progress, total: number): boolean {
  return p.currentIndex >= total
}

export function normalizeProgress(raw: unknown, total: number): Progress {
  if (!raw || typeof raw !== 'object') return createEmptyProgress()
  const obj = raw as Partial<Progress>
  if (typeof obj.currentIndex !== 'number') return createEmptyProgress()
  const currentIndex = Math.min(Math.max(0, Math.floor(obj.currentIndex)), total)
  const rawAnswers =
    obj.answers && typeof obj.answers === 'object' ? obj.answers : {}
  const answers: Record<string, UserAnswer> = {}
  for (const [k, v] of Object.entries(rawAnswers)) {
    if (
      v &&
      typeof v === 'object' &&
      typeof (v as { questionId: unknown }).questionId === 'string' &&
      (typeof (v as { correct: unknown }).correct === 'boolean' ||
        (v as { correct: unknown }).correct === null)
    ) {
      answers[k] = v as UserAnswer
    }
  }
  const wrongIds = Array.isArray(obj.wrongIds)
    ? obj.wrongIds.filter((x): x is string => typeof x === 'string')
    : []
  const updatedAt = typeof obj.updatedAt === 'number' ? obj.updatedAt : 0
  return { currentIndex, answers, wrongIds, updatedAt }
}
