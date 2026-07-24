'use client'
import Link from 'next/link'
import type { Progress } from '@/lib/progress'

interface Props {
  progress: Progress
  total: number
  subject?: string
  onRestart: () => void
}

export default function Summary({ progress, total, subject, onRestart }: Props) {
  const graded = Object.values(progress.answers).filter((a) => a.correct !== null)
  const correctCount = graded.filter((a) => a.correct === true).length
  const accuracy = graded.length ? Math.round((correctCount / graded.length) * 100) : 0

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <h2 className="mb-4 text-xl font-semibold text-ink">本次刷题完成</h2>
      <ul className="mb-5 space-y-2 text-sm text-muted">
        <li>
          总题数：<span className="text-ink">{total}</span>
        </li>
        <li>
          已作答：<span className="text-ink">{Object.keys(progress.answers).length}</span>
        </li>
        <li>
          自动判分题正确率：
          <span className="text-ink">
            {accuracy}%（{correctCount}/{graded.length}）
          </span>
        </li>
        <li>
          错题数：<span className="text-ink">{progress.wrongIds.length}</span>
        </li>
      </ul>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onRestart}
          className="rounded-xl bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          重新开始
        </button>
        {subject && (
          <Link
            href={`/practice?subject=${subject}&mode=wrong`}
            className="rounded-xl border border-line-strong px-5 py-2.5 font-medium text-accent transition-colors hover:border-accent"
          >
            查看错题
          </Link>
        )}
      </div>
    </div>
  )
}
