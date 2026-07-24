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

type Mode = 'all' | 'wrong' | 'flags' | 'memory' | 'review' | 'recap'

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
    modeParam === 'review' ||
    modeParam === 'recap'
      ? modeParam
      : 'all'

  const [bank, setBank] = useState<Question[]>(() => loadBank())
  const [flags, setFlags] = useState<Set<string>>(() => loadFlags())
  const [srs, setSrs] = useState<Record<string, SrsCard>>(() => loadSrs())
  const [localIndex, setLocalIndex] = useState(0)

  /* 挂载时从 localStorage 同步初始状态，属外部 store 初始化，非派生命题 */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setBank(loadBank())
    setFlags(loadFlags())
    setSrs(loadSrs())
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  /* 切换科目/模式时重置练习位置 */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLocalIndex(0)
  }, [mode, subject])
  /* eslint-enable react-hooks/set-state-in-effect */

  const allItems =
    subject === GENERAL_SUBJECT ? bank : bank.filter((q) => q.subject === subject)

  const [shuffle, setShuffle] = useState(false)
  /* 读取本地"随机/顺序"偏好 */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      setShuffle(localStorage.getItem('quiz-shuffle-v1') === '1')
    } catch {
      /* 忽略 */
    }
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */
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
  const [now] = useState(() => Date.now())

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

  // 专项列表（错题 / 复习）在进入本批时快照一次，练习期间固定，
  // 避免作答过程中 wrongIds / due 变化导致列表动态缩短、与 localIndex 错位而漏题
  const isSpecialMode = mode === 'wrong' || mode === 'review' || mode === 'recap'
  const [snapshot, setSnapshot] = useState<Question[] | null>(null)
  const snapKeyRef = useRef('')

  /* 进入错题/复习本批时快照一次题目列表，练习期间固定（避免列表动态缩短错位） */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!hydrated) return
    const key = `${mode}:${subject}`
    if (snapKeyRef.current === key) return
    snapKeyRef.current = key
    if (mode === 'wrong' || mode === 'recap') {
      setSnapshot(ordered.filter((q) => progress.wrongIds.includes(q.id)))
    } else if (mode === 'review') {
      setSnapshot(ordered.filter((q) => (srs[q.id]?.due ?? 0) <= now))
    } else {
      setSnapshot(null)
    }
    setLocalIndex(0)
  }, [mode, subject, hydrated, ordered, progress, srs, now])
  /* eslint-enable react-hooks/set-state-in-effect */

  const items =
    mode === 'all'
      ? ordered
      : isSpecialMode
        ? (snapshot ?? [])
        : mode === 'memory'
          ? ordered
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
  /* eslint-disable react-hooks/exhaustive-deps */
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
  /* eslint-enable react-hooks/exhaustive-deps */

  // 从错题本"重练"跳转：定位到指定题目（进入本批时定位一次，非派生命题）
  const focusId = params.get('q')
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!focusId || !hydrated) return
    const list = mode === 'all' ? ordered : (snapshot ?? [])
    const idx = list.findIndex((q) => q.id === focusId)
    if (idx >= 0 && mode !== 'all') setLocalIndex(idx)
  }, [focusId, hydrated, mode, ordered, snapshot])
  /* eslint-enable react-hooks/set-state-in-effect */

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
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center text-muted">
        加载中…
      </main>
    )
  }

  if (mode === 'all' && allItems.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center text-muted">
        该科目暂无题目，
        <Link href="/" className="text-accent">
          返回首页
        </Link>
      </main>
    )
  }

  if (mode === 'all' && isComplete) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <Summary progress={progress} total={total} subject={subject} onRestart={reset} />
        <Link href="/" className="mt-4 block text-center text-sm text-accent">
          返回首页
        </Link>
      </main>
    )
  }

  // 快照就绪前先占位，避免误报"暂无错题"
  if (isSpecialMode && snapshot === null) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center text-muted">
        加载中…
      </main>
    )
  }

  if (items.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center text-muted">
        {mode === 'wrong' || mode === 'recap' ? '该科目暂无错题，' : '该科目暂无标记题，'}
        <Link href={`/practice?subject=${subject}`} className="text-accent">
          去全部题目练习
        </Link>
      </main>
    )
  }

  if (!question) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center">
        <p className="mb-4 text-ink">本批练习已完成</p>
        <Link
          href={`/practice?subject=${subject}`}
          className="rounded-xl bg-accent px-5 py-2.5 font-medium text-white transition-colors hover:bg-accent-hover"
        >
          返回全部题目
        </Link>
      </main>
    )
  }

  // 重练错题：清除历史作答预填，强制从零作答；回顾错题：直接以已提交态呈现（显示答案）
  const isRedo = mode === 'wrong'
  const reviewMode = mode === 'recap'
  const saved = isRedo || reviewMode ? undefined : progress.answers[question.id]?.value
  const answeredFlag = reviewMode ? true : isRedo ? false : !!progress.answers[question.id]

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
      <div className="mb-3 flex items-center justify-between">
        <Link href="/" className="text-sm text-accent">
          ← 退出（进度已保存）
        </Link>
        <span className="text-sm text-muted">{subjectName(subject)}</span>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1 text-sm">
          <Tab href={`/practice?subject=${subject}`} active={mode === 'all'}>
            全部
          </Tab>
          <Tab href={`/practice?subject=${subject}&mode=wrong`} active={mode === 'wrong'}>
            错题
          </Tab>
          <Tab href={`/practice?subject=${subject}&mode=recap`} active={mode === 'recap'}>
            回顾
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
          className="shrink-0 rounded-lg border border-line px-3 py-1 text-sm text-muted transition-colors hover:border-line-strong"
        >
          {shuffle ? '随机' : '顺序'}
        </button>
      </div>

      {mode !== 'memory' && mode !== 'review' && mode !== 'recap' && (
        <div className="mb-4">
          <div className="mb-1 flex justify-between text-xs text-muted">
            <span>
              已答 {answered}/{items.length}
            </span>
            <span>
              正确率 {accuracy}%（{correctCount}/{graded.length}）
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-surface-2">
            <div
              className="h-2 rounded-full bg-accent transition-all"
              style={{ width: `${items.length ? (answered / items.length) * 100 : 0}%` }}
            />
          </div>
          <div className="mt-1 text-xs text-muted">剩余 {remaining} 题</div>
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
          onSelfGrade={reviewMode ? undefined : (c) => selfGrade(question.id, c)}
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
        'border-b-2 px-2.5 py-1 transition-colors',
        active
          ? 'border-accent font-medium text-accent'
          : 'border-transparent text-muted hover:text-ink',
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
        <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-16 text-center text-muted">
          加载中…
        </main>
      }
    >
      <PracticeInner />
    </Suspense>
  )
}
