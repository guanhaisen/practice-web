'use client'
import { useState } from 'react'
import type { Question } from '@/lib/questions'

interface Props {
  question: Question
  index: number
  total: number
  flagged: boolean
  onToggleFlag: () => void
  onMark: (remembered: boolean) => void
  onNext: () => void
  onPrev: () => void
}

function answerText(answer: unknown): string {
  if (Array.isArray(answer)) return answer.join('、')
  if (answer == null) return '—'
  return String(answer)
}

export default function ReviewCard({
  question,
  index,
  total,
  flagged,
  onToggleFlag,
  onMark,
  onNext,
  onPrev,
}: Props) {
  const [revealed, setRevealed] = useState(false)

  return (
    <div className="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-zinc-500">第 {index + 1}/{total} 题</span>
        <button
          type="button"
          onClick={onToggleFlag}
          className={`text-xl ${
            flagged ? 'text-amber-500' : 'text-zinc-300 hover:text-amber-400'
          }`}
          aria-label="标记难题"
        >
          {flagged ? '★' : '☆'}
        </button>
      </div>

      <p className="mb-4 whitespace-pre-wrap text-lg font-medium leading-relaxed">
        {question.stem}
      </p>

      {question.options && question.options.length > 0 && (
        <ul className="mb-4 space-y-2">
          {question.options.map((opt, i) => (
            <li
              key={i}
              className="rounded-lg border border-zinc-200 px-3 py-2 text-sm text-zinc-600 dark:border-zinc-800"
            >
              {opt}
            </li>
          ))}
        </ul>
      )}

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-700 dark:bg-zinc-800"
        >
          显示答案
        </button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-blue-50 p-3 text-sm dark:bg-blue-950">
            <div className="mb-1 font-medium text-blue-700">答案：</div>
            <div className="whitespace-pre-wrap">{answerText(question.answer)}</div>
            {question.explanation && (
              <div className="mt-2 text-zinc-600">
                <span className="font-medium">解析：</span>
                {question.explanation}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onMark(true)}
              className="flex-1 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium text-white"
            >
              记住了
            </button>
            <button
              type="button"
              onClick={() => onMark(false)}
              className="flex-1 rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              没记住
            </button>
          </div>
        </div>
      )}

      <div className="mt-5 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="rounded-lg border border-zinc-300 px-4 py-2 text-sm disabled:opacity-40 dark:border-zinc-700"
        >
          上一题
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index >= total - 1}
          className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white disabled:opacity-40"
        >
          下一题
        </button>
      </div>
    </div>
  )
}
