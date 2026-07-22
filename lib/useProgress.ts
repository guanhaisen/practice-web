'use client'

import { useCallback, useEffect, useState } from 'react'
import type { Question } from '@/lib/questions'
import { grade, type UserValue } from '@/lib/grading'
import {
  createEmptyProgress,
  isComplete,
  normalizeProgress,
  storageKeyFor,
  type Progress,
} from '@/lib/progress'

// items：当前科目（或综合）的题目列表；subject：用于进度分 key 存储
export function useProgress(items: Question[], subject: string) {
  const TOTAL = items.length
  const [progress, setProgress] = useState<Progress>(createEmptyProgress())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKeyFor(subject))
      const parsed = raw ? JSON.parse(raw) : null
      setProgress(normalizeProgress(parsed, TOTAL))
    } catch {
      setProgress(createEmptyProgress())
    } finally {
      setHydrated(true)
    }
  }, [subject, TOTAL])

  // 接收题目对象而非索引，避免全量/专项列表索引错位
  const submitAnswer = useCallback(
    (question: Question, value: UserValue) => {
      setProgress((prev) => {
        const correct = grade(question.type, value, question)
        const userAnswer = {
          questionId: question.id,
          type: question.type,
          value,
          correct,
        }
        const answers = { ...prev.answers, [question.id]: userAnswer }
        const wrongIds =
          correct === false && !prev.wrongIds.includes(question.id)
            ? [...prev.wrongIds, question.id]
            : prev.wrongIds
        const next: Progress = { ...prev, answers, wrongIds, updatedAt: Date.now() }
        try {
          localStorage.setItem(storageKeyFor(subject), JSON.stringify(next))
        } catch {
          /* 忽略写入失败（如隐私模式） */
        }
        return next
      })
    },
    [subject],
  )

  // 填空/简答自评：覆盖 correct 并同步 wrongIds
  const selfGrade = useCallback(
    (questionId: string, correct: boolean) => {
      setProgress((prev) => {
        const a = prev.answers[questionId]
        if (!a) return prev
        const answers = {
          ...prev.answers,
          [questionId]: { ...a, correct },
        }
        let wrongIds = prev.wrongIds
        if (correct) {
          wrongIds = prev.wrongIds.filter((id) => id !== questionId)
        } else if (!prev.wrongIds.includes(questionId)) {
          wrongIds = [...prev.wrongIds, questionId]
        }
        const next: Progress = { ...prev, answers, wrongIds, updatedAt: Date.now() }
        try {
          localStorage.setItem(storageKeyFor(subject), JSON.stringify(next))
        } catch {
          /* 忽略写入失败 */
        }
        return next
      })
    },
    [subject],
  )

  const next = useCallback(() => {
    setProgress((p) => {
      const nextIndex = Math.min(p.currentIndex + 1, TOTAL)
      const updated: Progress = { ...p, currentIndex: nextIndex, updatedAt: Date.now() }
      try {
        localStorage.setItem(storageKeyFor(subject), JSON.stringify(updated))
      } catch {
        /* 忽略写入失败 */
      }
      return updated
    })
  }, [subject, TOTAL])

  const prev = useCallback(() => {
    setProgress((p) => {
      const prevIndex = Math.max(p.currentIndex - 1, 0)
      const updated: Progress = { ...p, currentIndex: prevIndex, updatedAt: Date.now() }
      try {
        localStorage.setItem(storageKeyFor(subject), JSON.stringify(updated))
      } catch {
        /* 忽略写入失败 */
      }
      return updated
    })
  }, [subject])

  const reset = useCallback(() => {
    const empty = createEmptyProgress()
    try {
      localStorage.removeItem(storageKeyFor(subject))
    } catch {
      /* 忽略 */
    }
    setProgress(empty)
  }, [subject])

  return {
    progress,
    hydrated,
    total: TOTAL,
    isComplete: isComplete(progress, TOTAL),
    submitAnswer,
    selfGrade,
    next,
    prev,
    reset,
  }
}
