'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { loadBank } from '@/lib/bank'
import { storageKeyFor, normalizeProgress, type Progress } from '@/lib/progress'
import { subjectName } from '@/lib/subjects'
import type { Question } from '@/lib/questions'

function fmt(v: unknown): string {
  if (v == null) return '—'
  if (Array.isArray(v)) return v.join('、')
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

function WrongInner() {
  const params = useSearchParams()
  const subject = params.get('subject') ?? ''
  const [items, setItems] = useState<Question[]>([])
  const [progress, setProgress] = useState<Progress | null>(null)
  const [overview, setOverview] = useState<{ id: string; count: number }[]>([])
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    const bank = loadBank()
    if (subject) {
      const sub = bank.filter((q) => q.subject === subject)
      setItems(sub)
      try {
        const raw = localStorage.getItem(storageKeyFor(subject))
        setProgress(normalizeProgress(raw ? JSON.parse(raw) : null, sub.length))
      } catch {
        setProgress(null)
      }
    } else {
      const counts: { id: string; count: number }[] = []
      const ids = Array.from(new Set(bank.map((q) => q.subject)))
      for (const sid of ids) {
        const subLen = bank.filter((q) => q.subject === sid).length
        try {
          const raw = localStorage.getItem(storageKeyFor(sid))
          const p = normalizeProgress(raw ? JSON.parse(raw) : null, subLen)
          if (p.wrongIds.length > 0) counts.push({ id: sid, count: p.wrongIds.length })
        } catch {
          /* 忽略 */
        }
      }
      setOverview(counts)
    }
    setHydrated(true)
  }, [subject])

  function removeWrong(id: string) {
    if (!progress) return
    const wrongIds = progress.wrongIds.filter((x) => x !== id)
    const next: Progress = { ...progress, wrongIds, updatedAt: Date.now() }
    setProgress(next)
    try {
      localStorage.setItem(storageKeyFor(subject), JSON.stringify(next))
    } catch {
      /* 忽略写入失败 */
    }
  }

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">加载中…</main>
    )
  }

  if (!subject) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Link href="/" className="text-sm text-accent">
          ← 返回首页
        </Link>
        <h1 className="mb-1 mt-2 text-3xl font-bold tracking-tight text-ink">错题本</h1>
        <p className="mb-6 text-muted">选择一个科目查看并管理错题。</p>
        {overview.length === 0 ? (
          <p className="text-sm text-muted">暂无错题，继续保持～</p>
        ) : (
          <ul className="space-y-3">
            {overview.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/wrong?subject=${encodeURIComponent(o.id)}`}
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-3 font-medium text-accent"
                >
                  <span>{subjectName(o.id)}</span>
                  <span className="text-sm text-muted">{o.count} 题</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    )
  }

  const wrongQs = items.filter((q) => progress?.wrongIds.includes(q.id))

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-accent">
        ← 返回首页
      </Link>
      <h1 className="mb-1 mt-2 text-3xl font-bold tracking-tight text-ink">
        错题本{subject && ` · ${subjectName(subject)}`}
      </h1>
      <p className="mb-6 text-muted">
        共 {wrongQs.length} 道错题。可移除已掌握的题，或重新练习本科技错题。
      </p>

      {subject && wrongQs.length > 0 && (
        <Link
          href={`/practice?subject=${encodeURIComponent(subject)}&mode=wrong`}
          className="mb-6 inline-block rounded-xl bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          重练本科技错题
        </Link>
      )}

      {wrongQs.length === 0 ? (
        <p className="text-sm text-muted">暂无错题，继续保持～</p>
      ) : (
        <ul className="space-y-4">
          {wrongQs.map((q) => {
            const ans = progress?.answers[q.id]
            const correct = ans?.correct === true
            return (
              <li
                key={q.id}
                className="rounded-xl border border-line p-4"
              >
                <p className="mb-2 font-medium">{q.stem.slice(0, 120)}</p>
                <div className="space-y-1 text-sm">
                  <p>
                    你的答案：
                    <span className={correct ? 'text-success' : 'text-danger'}>
                      {fmt(ans?.value)}
                    </span>
                    {ans ? (correct ? ' ✓' : ' ✗') : ''}
                  </p>
                  <p>正确答案：{fmt(q.answer)}</p>
                  {q.explanation && (
                    <p className="text-muted">解析：{q.explanation}</p>
                  )}
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => removeWrong(q.id)}
                    className="rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink"
                  >
                    移除
                  </button>
                  <Link
                    href={`/practice?subject=${encodeURIComponent(
                      subject,
                    )}&mode=wrong&q=${encodeURIComponent(q.id)}`}
                    className="rounded-lg border border-accent px-3 py-1.5 text-sm text-accent"
                  >
                    重练
                  </Link>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </main>
  )
}

export default function WrongPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">加载中…</main>
      }
    >
      <WrongInner />
    </Suspense>
  )
}
