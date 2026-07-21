'use client'

import { useCallback, useEffect, useState } from 'react'
import { questions } from '@/lib/questions'
import { grade, type UserValue } from '@/lib/grading'
import {
  createEmptyProgress,
  isComplete,
  normalizeProgress,
  STORAGE_KEY,
  type Progress,
} from '@/lib/progress'

const TOTAL = questions.length

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(createEmptyProgress())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      setProgress(normalizeProgress(parsed, TOTAL))
    } catch {
      setProgress(createEmptyProgress())
    } finally {
      setHydrated(true)
    }
  }, [])

  const submitAnswer = useCallback((questionIndex: number, value: UserValue) => {
    setProgress((prev) => {
      const q = questions[questionIndex]
      const correct = grade(q.type, value, q)
      const userAnswer = { questionId: q.id, type: q.type, value, correct }
      const answers = { ...prev.answers, [q.id]: userAnswer }
      const wrongIds =
        correct === false && !prev.wrongIds.includes(q.id)
          ? [...prev.wrongIds, q.id]
          : prev.wrongIds
      const next: Progress = { ...prev, answers, wrongIds, updatedAt: Date.now() }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* 忽略写入失败（如隐私模式） */
      }
      return next
    })
  }, [])

  const next = useCallback(() => {
    setProgress((prev) => {
      const nextIndex = Math.min(prev.currentIndex + 1, TOTAL)
      const updated: Progress = { ...prev, currentIndex: nextIndex, updatedAt: Date.now() }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        /* 忽略写入失败 */
      }
      return updated
    })
  }, [])

  const reset = useCallback(() => {
    const empty = createEmptyProgress()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略 */
    }
    setProgress(empty)
  }, [])


  return {
    progress,
    hydrated,
    total: TOTAL,
    isComplete: isComplete(progress, TOTAL),
    submitAnswer,
    next,
    reset,
  }
}