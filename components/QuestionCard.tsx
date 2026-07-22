'use client'
import { useState } from 'react'
import type { Question } from '@/lib/questions'
import { grade, type UserValue } from '@/lib/grading'

interface Props {
  question: Question
  index: number
  total: number
  initialValue?: UserValue
  initialSubmitted?: boolean
  onSubmit: (value: UserValue) => void
  onNext: () => void
  onPrev?: () => void
}

export default function QuestionCard({
  question,
  index,
  total,
  initialValue,
  initialSubmitted,
  onSubmit,
  onNext,
  onPrev,
}: Props) {
  const [value, setValue] = useState<UserValue>(
    initialValue ?? (question.type === 'multiple' ? [] : ''),
  )
  const [submitted, setSubmitted] = useState(initialSubmitted ?? false)

  const isMultiple = question.type === 'multiple'
  const isFill = question.type === 'fill'

  const canSubmit = isFill
    ? typeof value === 'string' && value.trim().length > 0
    : isMultiple
      ? Array.isArray(value) && value.length > 0
      : typeof value === 'string' && value.length > 0

  function handleSubmit() {
    onSubmit(value)
    setSubmitted(true)
  }

  function toggleMultiple(opt: string) {
    if (submitted) return
    setValue((prev) => {
      const arr = Array.isArray(prev) ? prev : []
      return arr.includes(opt) ? arr.filter((o) => o !== opt) : [...arr, opt]
    })
  }

  function selectSingle(opt: string) {
    if (submitted) return
    setValue(opt)
  }

  const correctAnswer = Array.isArray(question.answer)
    ? question.answer.join('、')
    : question.answer

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-4 flex items-center gap-2 text-sm text-zinc-500">
        <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
          {labelOf(question.type)}
        </span>
        <span>
          第 {index + 1} / {total} 题
        </span>
        <button
          type="button"
          onClick={() => onPrev?.()}
          disabled={index === 0}
          className="ml-auto rounded-lg border border-zinc-300 px-2 py-1 text-zinc-600 transition-colors hover:border-zinc-400 disabled:cursor-not-allowed disabled:opacity-30 dark:border-zinc-700 dark:text-zinc-300"
        >
          ← 上一题
        </button>
      </div>

      <h2 className="mb-4 text-lg font-medium leading-7">{question.stem}</h2>

      {!isFill && question.options && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt) => {
            const selected = isMultiple
              ? Array.isArray(value) && value.includes(opt)
              : value === opt
            const isCorrectOpt = isCorrectSelection(opt, question)
            const isWrongPick = submitted && selected && !isCorrectOpt
            return (
              <button
                key={opt}
                type="button"
                disabled={submitted}
                onClick={() => (isMultiple ? toggleMultiple(opt) : selectSingle(opt))}
                className={[
                  'rounded-xl border px-4 py-3 text-left transition-colors',
                  submitted
                    ? isCorrectOpt
                      ? 'border-green-500 bg-green-50 dark:bg-green-950'
                      : isWrongPick
                        ? 'border-red-500 bg-red-50 dark:bg-red-950'
                        : 'border-zinc-200 dark:border-zinc-800'
                    : selected
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                      : 'border-zinc-200 hover:border-zinc-400 dark:border-zinc-800',
                ].join(' ')}
              >
                {opt}
              </button>
            )
          })}
        </div>
      )}

      {isFill && (
        <input
          type="text"
          value={typeof value === 'string' ? value : ''}
          disabled={submitted}
          onChange={(e) => setValue(e.target.value)}
          placeholder="请输入你的答案"
          className="w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
        />
      )}

      {!submitted && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="mt-5 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white disabled:opacity-40"
        >
          提交
        </button>
      )}

      {submitted && (
        <div className="mt-5">
          {question.type !== 'fill' ? (
            <p className={isWrongAnswer(question, value) ? 'mb-2 font-medium text-red-600' : 'mb-2 font-medium text-green-600'}>
              {isWrongAnswer(question, value) ? '回答错误' : '回答正确'}
            </p>
          ) : (
            <p className="mb-2 font-medium text-zinc-500">
              提交成功（填空/简答请你自行对照参考答案）
            </p>
          )}
          <div className="rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800">
            <p className="mb-1">
              <span className="font-medium">参考答案：</span>
              {correctAnswer}
            </p>
            {question.explanation && (
              <p>
                <span className="font-medium">解析：</span>
                {question.explanation}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onNext}
            className="mt-4 rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white"
          >
            下一题
          </button>
        </div>
      )}
    </div>
  )
}

function labelOf(type: Question['type']): string {
  switch (type) {
    case 'single':
      return '单选'
    case 'multiple':
      return '多选'
    case 'judge':
      return '判断'
    case 'fill':
      return '填空'
  }
}

function isCorrectSelection(opt: string, q: Question): boolean {
  return Array.isArray(q.answer) ? q.answer.includes(opt) : q.answer === opt
}

function isWrongAnswer(q: Question, value: UserValue): boolean {
  const g = grade(q.type, value, q)
  return g === null ? false : !g
}
