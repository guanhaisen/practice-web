'use client'
import { useEffect, useState } from 'react'
import type { Question } from '@/lib/questions'
import { grade, type UserValue } from '@/lib/grading'

interface Props {
  question: Question
  index: number
  total: number
  initialValue?: UserValue
  initialSubmitted?: boolean
  flagged?: boolean
  onToggleFlag?: () => void
  onSubmit: (value: UserValue) => void
  onNext: () => void
  onPrev?: () => void
  onSelfGrade?: (correct: boolean) => void
}

export default function QuestionCard({
  question,
  index,
  total,
  initialValue,
  initialSubmitted,
  flagged,
  onToggleFlag,
  onSubmit,
  onNext,
  onPrev,
  onSelfGrade,
}: Props) {
  const [value, setValue] = useState<UserValue>(
    initialValue ?? (question.type === 'multiple' ? [] : ''),
  )
  const [submitted, setSubmitted] = useState(initialSubmitted ?? false)
  const [collapsed, setCollapsed] = useState(false)
  const [selfGraded, setSelfGraded] = useState<boolean | null>(null)

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

  // 键盘答题：1-4 / A-D 选选项，Enter 提交或下一题；输入框内按键忽略
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (!submitted) {
        let idx = -1
        if (/^[1-4]$/.test(e.key)) idx = Number(e.key) - 1
        else if (/^[a-dA-D]$/.test(e.key)) idx = e.key.toLowerCase().charCodeAt(0) - 97
        if (idx >= 0 && question.options && idx < question.options.length) {
          const opt = question.options[idx]
          if (question.type === 'multiple') toggleMultiple(opt)
          else selectSingle(opt)
          return
        }
        if (e.key === 'Enter') {
          e.preventDefault()
          if (canSubmit) handleSubmit()
        }
      } else if (e.key === 'Enter') {
        e.preventDefault()
        onNext()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [submitted, question, canSubmit, onNext])

  const correctAnswer = Array.isArray(question.answer)
    ? question.answer.join('、')
    : question.answer

  return (
    <div className="rounded-2xl border border-line bg-surface p-6">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted">
        <span className="rounded-full bg-surface-2 px-2 py-0.5">{labelOf(question.type)}</span>
        <span>
          第 {index + 1} / {total} 题
        </span>
        <div className="ml-auto flex items-center gap-2">
          {onToggleFlag && (
            <button
              type="button"
              onClick={onToggleFlag}
              className={[
                'rounded-lg border px-2 py-1 transition-colors',
                flagged
                  ? 'border-accent bg-accent-soft text-accent'
                  : 'border-line text-faint hover:border-line-strong',
              ].join(' ')}
            >
              {flagged ? '★ 已标记' : '☆ 标记'}
            </button>
          )}
          <button
            type="button"
            onClick={() => onPrev?.()}
            disabled={index === 0}
            className="rounded-lg border border-line px-2 py-1 text-muted transition-colors hover:border-line-strong disabled:cursor-not-allowed disabled:opacity-30"
          >
            ← 上一题
          </button>
        </div>
      </div>

      <h2 className="mb-4 text-lg font-medium leading-7 text-ink">{question.stem}</h2>

      {!isFill && question.options && (
        <div className="flex flex-col gap-2">
          {question.options.map((opt, oi) => {
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
                      ? 'border-success bg-success-soft'
                      : isWrongPick
                        ? 'border-danger bg-danger-soft'
                        : 'border-line'
                    : selected
                      ? 'border-accent bg-accent-soft'
                      : 'border-line hover:border-line-strong',
                ].join(' ')}
              >
                <span className="mr-2 text-faint">{oi + 1}.</span>
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
          className="w-full rounded-xl border border-line bg-surface px-4 py-3 outline-none focus:border-accent"
        />
      )}

      {!submitted && (
        <button
          type="button"
          disabled={!canSubmit}
          onClick={handleSubmit}
          className="mt-5 rounded-xl bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          提交
        </button>
      )}

      {submitted && (
        <div className="mt-5">
          {question.type !== 'fill' ? (
            <p
              className={
                isWrongAnswer(question, value)
                  ? 'mb-2 font-medium text-danger'
                  : 'mb-2 font-medium text-success'
              }
            >
              {isWrongAnswer(question, value) ? '回答错误' : '回答正确'}
            </p>
          ) : selfGraded === null ? (
            <div className="mb-2">
              <p className="mb-2 font-medium text-muted">
                提交成功（填空/简答请你自行对照参考答案）
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelfGraded(true)
                    onSelfGrade?.(true)
                  }}
                  className="rounded-xl border border-success px-4 py-2 font-medium text-success"
                >
                  我答对了
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelfGraded(false)
                    onSelfGrade?.(false)
                  }}
                  className="rounded-xl border border-danger px-4 py-2 font-medium text-danger"
                >
                  我答错了
                </button>
              </div>
            </div>
          ) : (
            <p className="mb-2 font-medium text-muted">
              已自评：{selfGraded ? '答对' : '答错'}
            </p>
          )}

          <div className="rounded-xl bg-surface-2 p-4 text-sm">
            {!collapsed && (
              <>
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
              </>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="mt-2 text-sm text-muted hover:text-ink"
          >
            {collapsed ? '展开解析' : '收起解析'}
          </button>

          <button
            type="button"
            onClick={onNext}
            className="mt-4 rounded-xl bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
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
