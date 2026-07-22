'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  loadHistory,
  weaknessBySubject,
  type HistoryEntry,
} from '@/lib/history'
import { subjectName } from '@/lib/subjects'

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

  useEffect(() => {
    setEntries(loadHistory())
    setHydrated(true)
  }, [])

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">加载中…</main>
    )
  }

  const weak = weaknessBySubject(entries)

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-blue-600">
        ← 返回首页
      </Link>
      <h1 className="mb-6 mt-2 text-3xl font-bold tracking-tight">练习历史</h1>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">薄弱科目</h2>
        {weak.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无数据，完成练习后自动统计。</p>
        ) : (
          <ul className="space-y-2">
            {weak.map((s) => {
              const pct = Math.round(s.accuracy * 100)
              const weakTag = s.accuracy < 0.7
              return (
                <li
                  key={s.subject}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
                >
                  <Link
                    href={`/practice?subject=${encodeURIComponent(s.subject)}`}
                    className="font-medium text-blue-600"
                  >
                    {subjectName(s.subject)}
                  </Link>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-zinc-500">
                      {s.correct}/{s.total} 题
                    </span>
                    <span
                      className={
                        weakTag
                          ? 'font-medium text-red-600'
                          : 'font-medium text-green-600'
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

      <section>
        <h2 className="mb-3 text-lg font-semibold">历史记录</h2>
        {entries.length === 0 ? (
          <p className="text-sm text-zinc-500">暂无记录。</p>
        ) : (
          <ul className="space-y-2">
            {entries.map((e) => (
              <li
                key={e.id}
                className="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3 text-sm dark:border-zinc-800"
              >
                <div className="flex items-center gap-3">
                  <span className="text-zinc-500">{fmtTime(e.at)}</span>
                  <Link
                    href={`/practice?subject=${encodeURIComponent(e.subject)}`}
                    className="font-medium text-blue-600"
                  >
                    {subjectName(e.subject)}
                  </Link>
                  <span className="text-zinc-400">{MODE_LABEL[e.mode] ?? e.mode}</span>
                </div>
                <span className="text-zinc-500">
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
