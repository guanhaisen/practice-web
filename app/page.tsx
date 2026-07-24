'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { downloadBackup } from '@/lib/backup'
import { subjects, GENERAL_SUBJECT, GENERAL_NAME, subjectName } from '@/lib/subjects'
import { loadBank } from '@/lib/bank'
import { loadFlags } from '@/lib/flags'
import { loadSrs, type SrsCard } from '@/lib/srs'
import {
  storageKeyFor,
  normalizeProgress,
  type Progress,
} from '@/lib/progress'
import { loadSelectedSubjects, saveSelectedSubjects } from '@/lib/userPrefs'
import type { Question } from '@/lib/questions'
import ProgressRing from '@/components/ProgressRing'

function countOf(bank: Question[], subjectId: string): number {
  return bank.filter((q) => q.subject === subjectId).length
}

function readProgress(subjectId: string, total: number): Progress | null {
  try {
    const raw = localStorage.getItem(storageKeyFor(subjectId))
    if (!raw) return null
    return normalizeProgress(JSON.parse(raw), total)
  } catch {
    return null
  }
}

export default function Home() {
  const [hydrated, setHydrated] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [editing, setEditing] = useState(false)
  const [picks, setPicks] = useState<Set<string>>(new Set())
  const [bank, setBank] = useState<Question[]>(() => loadBank())
  const [flags, setFlags] = useState<Set<string>>(() => loadFlags())
  const [srs, setSrs] = useState<Record<string, SrsCard>>(() => loadSrs())

  /* 挂载时从 localStorage 同步初始状态，属外部 store 初始化，非派生命题 */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const saved = loadSelectedSubjects()
    if (saved === null) {
      setSelected([])
      setPicks(new Set())
      setEditing(true)
    } else {
      setSelected(saved)
      setPicks(new Set(saved))
      setEditing(false)
    }
    setBank(loadBank())
    setFlags(loadFlags())
    setSrs(loadSrs())
    setHydrated(true)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  function toggle(id: string) {
    setPicks((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function confirm() {
    if (picks.size === 0) return
    const ids = subjects.map((s) => s.id).filter((id) => picks.has(id))
    saveSelectedSubjects(ids)
    setSelected(ids)
    setEditing(false)
  }

  function resetSubject(id: string) {
    if (
      !window.confirm(
        `确定重置「${subjectName(id)}」的进度与错题吗？此操作不可撤销。`,
      )
    )
      return
    try {
      localStorage.removeItem(storageKeyFor(id))
    } catch {
      /* 忽略 */
    }
    setBank(loadBank())
  }

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16 text-center text-muted">
        加载中…
      </main>
    )
  }

  if (editing) {
    return (
      <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-ink">
          选择练习科目
        </h1>
        <p className="mb-8 text-muted">
          勾选你要练习的科目，确认后即可开始；后续可随时修改。
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {subjects.map((s) => {
            const on = picks.has(s.id)
            const count = countOf(bank, s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s.id)}
                className={[
                  'rounded-xl border px-4 py-4 text-center transition-colors',
                  on
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-ink hover:border-line-strong',
                ].join(' ')}
              >
                <div className="font-medium">{s.name}</div>
                <div className="mt-1 text-xs text-faint">
                  {count > 0 ? `${count} 题` : '暂无'}
                </div>
              </button>
            )
          })}
        </div>
        <button
          type="button"
          onClick={confirm}
          disabled={picks.size === 0}
          className="mt-6 w-full rounded-xl bg-accent px-5 py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:opacity-40"
        >
          确认并开始（已选 {picks.size} 科）
        </button>
      </main>
    )
  }

  const chosen = subjects.filter((s) => selected.includes(s.id))

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-ink">
        大学生刷题
      </h1>
      <p className="mb-8 text-muted">
        已选科目，点击开始练习；进度按科目自动保存在本地。
      </p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {chosen.map((s) => {
          const total = countOf(bank, s.id)
          const prog = readProgress(s.id, total)
          const answered = prog ? Object.keys(prog.answers).length : 0
          const wrongCount = prog ? prog.wrongIds.length : 0
          const flagCount = bank.filter(
            (q) => q.subject === s.id && flags.has(q.id),
          ).length
          const empty = total === 0
          const dueCount = bank.filter(
            (q) => q.subject === s.id && (srs[q.id]?.due ?? 0) <= Date.now(),
          ).length
          const pct = total ? Math.round((answered / total) * 100) : 0
          return (
            <div
              key={s.id}
              className="flex items-center gap-4 rounded-xl border border-line bg-surface p-4"
            >
              <div className="min-w-0 flex-1">
                <Link
                  href={`/practice?subject=${s.id}`}
                  className="block font-medium text-ink transition-colors hover:text-accent"
                >
                  {s.name}
                </Link>
                <div className="mt-1 text-xs text-faint">
                  {empty
                    ? '待导入'
                    : `共 ${total} 题${
                        answered > 0 ? ` · 已做 ${answered}/${total}` : ''
                      }`}
                </div>
                {!empty && (
                  <div className="mt-2 flex items-center gap-3 text-xs">
                    <Link
                      href={`/wrong?subject=${s.id}`}
                      className="text-danger transition-colors hover:underline"
                    >
                      错题 {wrongCount}
                    </Link>
                    <Link
                      href={`/practice?subject=${s.id}&mode=flags`}
                      className="text-warn transition-colors hover:underline"
                    >
                      难题 {flagCount}
                    </Link>
                    {dueCount > 0 && (
                      <Link
                        href={`/practice?subject=${s.id}&mode=review`}
                        className="text-accent transition-colors hover:underline"
                      >
                        复习 {dueCount}
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={() => resetSubject(s.id)}
                      className="ml-auto text-faint transition-colors hover:text-danger hover:underline"
                    >
                      重置
                    </button>
                  </div>
                )}
              </div>
              {!empty && (
                <div className="relative shrink-0">
                  <ProgressRing value={total ? answered / total : 0} />
                  <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-muted">
                    {pct}%
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4">
        <Link
          href={`/practice?subject=${GENERAL_SUBJECT}`}
          className="block rounded-xl border border-dashed border-line-strong px-4 py-3 text-center text-sm text-muted transition-colors hover:border-accent hover:text-accent"
        >
          {GENERAL_NAME}（{bank.length} 题，含全部示例）
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap justify-center gap-4">
        <Link href="/import" className="text-sm text-accent hover:underline">
          导入 / 管理题库
        </Link>
        <Link href="/history" className="text-sm text-accent hover:underline">
          练习历史
        </Link>
        <Link href="/wrong" className="text-sm text-accent hover:underline">
          错题本
        </Link>
        <button
          type="button"
          onClick={downloadBackup}
          className="text-sm text-accent underline-offset-2 hover:underline"
        >
          导出备份
        </button>
      </div>

      <button
        type="button"
        onClick={() => {
          setPicks(new Set(selected))
          setEditing(true)
        }}
        className="mt-6 w-full rounded-xl border border-line-strong px-5 py-3 font-medium text-ink transition-colors hover:border-accent"
      >
        修改选科
      </button>
    </main>
  )
}
