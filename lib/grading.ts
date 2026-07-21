import type { Question, QuestionType } from './questions'

export type UserValue = string | string[]

export function grade(type: QuestionType, userValue: UserValue, question: Question): boolean | null {
  if (type === 'fill') return null
  if (type === 'multiple') {
    const selected = Array.isArray(userValue) ? userValue : []
    const correct = question.answer as string[]
    if (selected.length !== correct.length) return false
    return correct.every((a) => selected.includes(a))
  }
  // single / judge
  return userValue === question.answer
}
