'use client'
import { Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useProgress } from '@/lib/useProgress'
import { loadBank } from '@/lib/bank'
import { GENERAL_SUBJECT, subjectName } from '@/lib/subjects'
import { loadFlags, saveFlags } from '@/lib/flags'
import { recordHistory } from '@/lib/history'
import { loadSrs, reviewCard, saveSrs, type SrsCard } from '@/lib/srs'
import type { Question } from '@/lib/questions'
import QuestionCard from '@/components/QuestionCard'
import ReviewCard from '@/components/ReviewCard'
import Summary from '@/components/Summary'

type Mode = 'all' | 'wrong' | 'flags' | 'memory' | 'review'

// 按科目确定性打乱，保证刷新后同科目顺序一致（续练不错位）
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  const rand = () => {
    h += 0x6d2b79f5
    let t = h
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function PracticeInner() {
  const params = useSearchParams()
  const subject = params.get('subject') ?? GENERAL_SUBJECT
  const modeParam = params.get('mode')
  const mode: Mode =
    modeParam === 'wrong' ||
    modeParam === 'flags' ||
    modeParam === 'memory' ||
    modeParam === 'review'
      ? modeParam
      : 'all'

  const [bank, setBank] = useState<Question[]>(() => loadBank())
  const [flags, setFlags] = useState<Set<string>>(() => loadFlags())
  const [srs, setSrs] = useState<Record<string, SrsCard>>(() => loadSrs())
  const [localIndex, setLocalIndex] = useState(0)

  useEffect(() => {
    setBank(loadBank())
    setFlags(loadFlags())
    setSrs(loadSrs())
  }, [])

  useEffect(() => {
    setLocalIndex(0)
  }, [mode, subject])

  const allItems =
    subject === GENERAL_SUBJECT ? bank : bank.filter((q) => q.subject === subject)

  const [shuffle, setShuffle] = useState(false)
  useEffect(() => {
    try {
      setShuffle(localStorage.getItem('quiz-shuffle-v1') === '1')
    } catch {
      /* 忽略 */
    }
  }, [])
  function toggleShuffle() {
    setShuffle((s) => {
      const n = !s
      try {
        localStorage.setItem('quiz-shuffle-v1', n ? '1' : '0')
      } catch {
        /* 忽略 */
      }
      return n
    })
    if (mode === 'all') restart()
  }

  const ordered = shuffle ? seededShuffle(allItems, subject) : allItems
  const now = Date.now()

  const {
    progress,
    hydrated,
    total,
    isComplete,
    submitAnswer,
    selfGrade,
    next,
    prev,
    reset,
    restart,
  } = useProgress(allItems, subject)

  const items =
    mode === 'all'
      ? ordered
      : mode === 'wrong'
        ? ordered.filter((q) => progress.wrongIds.includes(q.id))
        : mode === 'memory'
          ? ordered
          : mode === 'review'
            ? ordered.filter((q) => (srs[q.id]?.due ?? 0) <= now)
            : ordered.filter((q) => flags.has(q.id))

  const displayIndex = mode === 'all' ? progress.currentIndex : localIndex
  const question = items[displayIndex]

  // 实时统计（针对当前列表）
  const answered = items.filter((q) => progress.answers[q.id]).length
  const graded = items
    .map((q) => progress.answers[q.id])
    .filter((a): a is NonNullable<typeof a> => !!a && a.correct !== null)
  const correctCount = graded.filter((a) => a.correct === true).length
  const accuracy = graded.length ? Math.round((correctCount / graded.length) * 100) : 0
  const remaining = items.length - answered

  // 本批全部作答完成后记录一次历史（用于薄弱分析）
  const recordedRef = useRef(false)
  useEffect(() => {
    if (recordedRef.current) return
    if (items.length > 0 && answered >= items.length) {
      recordedRef.current = true
      const correct = items.filter(
        (q) => progress.answers[q.id]?.correct === true,
      ).length
      const missed = items
        .filter((q) => progress.answers[q.id]?.correct === false)
        .map((q) => q.id)
      recordHistory({ subject, mode, total: items.length, answered, correct, missed })
    }
  }, [items.length, answered, progress, subject, mode])

  // 从错题本"重练"跳转：定位到指定题目（非全部模式用 localIndex）
  const focusId = params.get('q')
  useEffect(() => {
    if (!focusId || !hydrated) return
    const idx = items.findIndex((q) => q.id === focusId)
    if (idx >= 0 && mode !== 'all') setLocalIndex(idx)
  }, [focusId, hydrated, items, mode])

  function toggleFlag(id: string) {
    setFlags((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      saveFlags(n)
      return n
    })
  }

  function markRemembered(id: string, remembered: boolean) {
    setSrs((prev) => {
      const next = reviewCard(prev, id, remembered, Date.now())
      try {
        saveSrs(next)
      } catch {
        /* 忽略写入失败 */
      }
      return next
    })
  }

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center text-zinc-500">
        加载中…
      </main>
    )
  }

  if (mode === 'all' && allItems.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center text-zinc-500">
        该科目暂无题目，
        <Link href="/" className="text-blue-600">
          返回首页
        </Link>
      </main>
    )
  }

  if (mode === 'all' && isComplete) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <Summary progress={progress} total={total} subject={subject} onRestart={reset} />
        <Link href="/" className="mt-4 block text-center text-sm text-blue-600">
          返回首页
        </Link>
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center text-zinc-500">
        {mode === 'wrong' ? '该科目暂无错题，' : '该科目暂无标记题，'}
        <Link href={`/practice?subject=${subject}`} className="text-blue-600">
          去全部题目练习
        </Link>
      </main>
    )
  }

  if (!question) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center">
        <p className="mb-4 text-zinc-600">本批练习已完成 🎉</p>
        <Link
          href={`/practice?subject=${subject}`}
          className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white"
        >
          返回全部题目
        </Link>
      </main>
    )
  }

  const saved = progress.answers[question.id]?.value
  const answeredFlag = !!progress.answers[question.id]

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-blue-600">
          ← 退出（进度已保存）
        </Link>
        <span className="text-sm text-zinc-500">{subjectName(subject)}</span>
      </div>

      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2 text-sm">
          <Tab href={`/practice?subject=${subject}`} active={mode === 'all'}>
            全部
          </Tab>
          <Tab href={`/practice?subject=${subject}&mode=wrong`} active={mode === 'wrong'}>
            错题
          </Tab>
          <Tab href={`/practice?subject=${subject}&mode=flags`} active={mode === 'flags'}>
            难题
          </Tab>
          <Tab href={`/practice?subject=${subject}&mode=memory`} active={mode === 'memory'}>
            背题
          </Tab>
          <Tab href={`/practice?subject=${subject}&mode=review`} active={mode === 'review'}>
            复习
          </Tab>
        </div>
        <button
          type="button"
          onClick={toggleShuffle}
          className="rounded-lg border border-zinc-300 px-3 py-1 text-sm text-zinc-500 transition-colors hover:border-zinc-400 dark:border-zinc-700"
        >
          {shuffle ? '随机 🔀' : '顺序 ⟳'}
        </button>
      </div>

      {mode !== 'memory' && mode !== 'review' && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-zinc-500">
            <span>
              已答 {answered}/{items.length}
            </span>
            <span>
              正确率 {accuracy}%（{correctCount}/{graded.length}）
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-2 rounded-full bg-blue-600 transition-all"
              style={{ width: `${items.length ? (answered / items.length) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-zinc-500">剩余 {remaining} 题</div>
        </div>
      )}

      {(mode === 'memory' || mode === 'review') ? (
        <ReviewCard
          key={question.id}
          question={question}
          index={displayIndex}
          total={items.length}
          flagged={flags.has(question.id)}
          onToggleFlag={() => toggleFlag(question.id)}
          onMark={(c: boolean) => {
            selfGrade(question.id, c)
            markRemembered(question.id, c)
          }}
          onNext={() => setLocalIndex((i) => Math.min(i + 1, items.length))}
          onPrev={() => setLocalIndex((i) => Math.max(i - 1, 0))}
        />
      ) : (
        <QuestionCard
          key={question.id}
          question={question}
          index={displayIndex}
          total={items.length}
          initialValue={saved}
          initialSubmitted={answeredFlag}
          flagged={flags.has(question.id)}
          onToggleFlag={() => toggleFlag(question.id)}
          onSubmit={(value) => submitAnswer(question, value)}
          onSelfGrade={(c) => selfGrade(question.id, c)}
          onNext={
            mode === 'all'
              ? next
              : () => setLocalIndex((i) => Math.min(i + 1, items.length))
          }
          onPrev={
            mode === 'all' ? prev : () => setLocalIndex((i) => Math.max(i - 1, 0))
          }
        />
      )}
    </main>
  )
}

function Tab({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={[
        'rounded-lg border px-3 py-1 transition-colors',
        active
          ? 'border-blue-500 bg-blue-50 text-blue-600 dark:bg-blue-950'
          : 'border-zinc-300 text-zinc-500 hover:border-zinc-400 dark:border-zinc-700',
      ].join(' ')}
    >
      {children}
    </Link>
  )
}

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center text-zinc-500">
          加载中…
        </main>
      }
    >
      <PracticeInner />
    </Suspense>
  )
}
