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
    <div className="rounded-2xl border border-line bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-muted">第 {index + 1}/{total} 题</span>
        <button
          type="button"
          onClick={onToggleFlag}
          className={`text-xl ${
            flagged ? 'text-accent' : 'text-faint hover:text-accent'
          }`}
          aria-label="标记难题"
        >
          {flagged ? '★' : '☆'}
        </button>
      </div>

      <p className="mb-4 whitespace-pre-wrap text-lg font-medium leading-relaxed text-ink">
        {question.stem}
      </p>

      {question.options && question.options.length > 0 && (
        <ul className="mb-4 space-y-2">
          {question.options.map((opt, i) => (
            <li
              key={i}
              className="rounded-lg border border-line px-3 py-2 text-sm text-muted"
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
          className="rounded-xl bg-surface-2 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-line"
        >
          显示答案
        </button>
      ) : (
        <div className="space-y-4">
          <div className="rounded-lg bg-accent-soft p-3 text-sm">
            <div className="mb-1 font-medium text-accent">答案：</div>
            <div className="whitespace-pre-wrap">{answerText(question.answer)}</div>
            {question.explanation && (
              <div className="mt-2 text-muted">
                <span className="font-medium">解析：</span>
                {question.explanation}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onMark(true)}
              className="flex-1 rounded-xl bg-success px-4 py-2 text-sm font-medium text-white"
            >
              记住了
            </button>
            <button
              type="button"
              onClick={() => onMark(false)}
              className="flex-1 rounded-xl bg-danger px-4 py-2 text-sm font-medium text-white"
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
          className="rounded-lg border border-line px-4 py-2 text-sm text-muted transition-colors hover:border-line-strong disabled:opacity-40"
        >
          上一题
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={index >= total - 1}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          下一题
        </button>
      </div>
    </div>
  )
}
