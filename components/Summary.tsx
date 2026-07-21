'use client'
import type { Progress } from '@/lib/progress'
import { questions } from '@/lib/questions'

interface Props {
  progress: Progress
  onRestart: () => void
}

export default function Summary({ progress, onRestart }: Props) {
  const graded = Object.values(progress.answers).filter((a) => a.correct !== null)
  const correctCount = graded.filter((a) => a.correct === true).length
  const accuracy = graded.length ? Math.round((correctCount / graded.length) * 100) : 0

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-xl font-semibold">本次刷题完成 🎉</h2>
      <ul className="mb-5 space-y-2 text-sm">
        <li>总题数：{questions.length}</li>
        <li>已作答：{Object.keys(progress.answers).length}</li>
        <li>
          自动判分题正确率：{accuracy}%（{correctCount}/{graded.length}）
        </li>
        <li>错题数：{progress.wrongIds.length}</li>
      </ul>
      <button
        type="button"
        onClick={onRestart}
        className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white"
      >
        重新开始
      </button>
    </div>
  )
}
