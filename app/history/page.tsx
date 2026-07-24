'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  loadHistory,
  weaknessBySubject,
  weaknessByQuestion,
  type HistoryEntry,
} from '@/lib/history'
import { subjectName } from '@/lib/subjects'
import { loadBank } from '@/lib/bank'
import type { Question } from '@/lib/questions'

const MODE_LABEL: Record<string, string> = {
  all: '全部',
  wrong: '错题',
  flags: '难题',
}

function fmtTime(ts: number): string {
  try {
    return new Date(ts).toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return String(ts)
  }
}

export default function HistoryPage() {
  const [entries, setEntries] = useState<HistoryEntry[]>([])
  const [hydrated, setHydrated] = useState(false)

  /* 挂载时从 localStorage 读取历史，属外部 store 初始化 */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setEntries(loadHistory())
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">加载中…</main>
    )
  }

  const weak = weaknessBySubject(entries)
  const bank = loadBank()
  const byId = new Map<string, Question>(bank.map((q) => [q.id, q]))
  const frequent = weaknessByQuestion(entries)
    .filter((s) => s.count >= 2)
    .slice(0, 30)

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-accent">
        ← 返回首页
      </Link>
      <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight text-ink">练习历史</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">薄弱科目</h2>
        {weak.length === 0 ? (
          <p className="text-sm text-muted">暂无数据，完成练习后自动统计。</p>
        ) : (
          <ul className="space-y-2">
            {weak.map((s) => {
              const pct = Math.round(s.accuracy * 100)
              const weakTag = s.accuracy < 0.7
              return (
                <li
                  key={s.subject}
                  className="flex items-center justify-between rounded-xl border border-line px-4 py-3"
                >
                  <Link
                    href={`/practice?subject=${encodeURIComponent(s.subject)}`}
                    className="font-medium text-accent"
                  >
                    {subjectName(s.subject)}
                  </Link>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-muted">
                      {s.correct}/{s.total} 题
                    </span>
                    <span
                      className={
                        weakTag
                          ? 'font-medium text-danger'
                          : 'font-medium text-success'
                      }
                    >
                      正确率 {pct}%
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">高频错题</h2>
        {frequent.length === 0 ? (
          <p className="text-sm text-muted">暂无反复出错的题（错 2 次及以上）。</p>
        ) : (
          <ul className="space-y-2">
            {frequent.map((s) => {
              const q = byId.get(s.id)
              if (!q) return null
              return (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"
                >
                  <Link
                    href={`/practice?subject=${encodeURIComponent(
                      q.subject,
                    )}&mode=wrong&q=${encodeURIComponent(q.id)}`}
                    className="line-clamp-2 font-medium text-accent"
                  >
                    {q.stem.slice(0, 60)}
                  </Link>
                  <span className="shrink-0 text-xs text-danger">错 {s.count} 次</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">历史记录</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-muted">暂无记录。</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm"
              >
                <div className="flex items-center gap-3">
                  <span className="text-muted">{fmtTime(e.at)}</span>
                  <Link
                    href={`/practice?subject=${encodeURIComponent(e.subject)}`}
                    className="font-medium text-accent"
                  >
                    {subjectName(e.subject)}
                  </Link>
                  <span className="text-faint">{MODE_LABEL[e.mode] ?? e.mode}</span>
                </div>
                <span className="text-muted">
                  {e.correct}/{e.total} · {Math.round(e.accuracy * 100)}%
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
