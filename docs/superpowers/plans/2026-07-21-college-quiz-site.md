# 大学生刷题网站 (v1) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现一个纯客户端的期末复习刷题网站：按题库顺序逐题练习、提交看解析、进度本地保存可续刷。

**Architecture:** 方案 A 纯客户端。题库为静态 TS 模块（`lib/questions.ts`），全部交互页面用 client component（`'use client'`），进度读写封装在 `lib/useProgress.ts` 并通过 localStorage 持久化。无 API routes、无数据库、无登录，可纯静态部署。Next.js 16 app router 约定：页面/组件文件顶部加 `'use client'`；从 Server 传给 Client 的 props 必须可序列化——本计划所有交互页均为 client 组件，子组件用回调 props 属同一客户端模块图，不受该限制。

**Tech Stack:** Next.js 16.2.10 + React 19.2.4 + Tailwind CSS 4 + TypeScript 5（pnpm 管理）。

## Global Constraints

- 方案 A：纯客户端，无后端、无数据库、无登录（spec §1）
- 题库：平铺一份，无科目/章节分组（spec §1、§3）
- 题型：单选 `single`、多选 `multiple`、判断 `judge`、填空/简答 `fill`（spec §3）
- 填空/简答**不自判**：提交后显示参考答案与解析，不判对错、不计入正确率、不进错题本（spec §4）
- 进度：localStorage 保存（key `quiz-progress-v1`），退出自动落盘，下次可续刷（spec §5）
- 顺序：按题库导入顺序排列，不随机（spec §用户确认）
- 题库导入功能**后置**，v1 仅用硬编码示例数据（spec §1、§9）
- 示例数据：10–15 道覆盖四类的题，仅用于跑通（spec §9）
- 自动化测试：v1 **不写**（spec §10）。验证用类型检查 + `pnpm build` + 手动走查代替。
- 写代码前已读 `node_modules/next/dist/docs/`（AGENTS.md 要求），本计划代码遵循 Next 16 app-router / `'use client'` 约定。

---

## File Structure

| 文件 | 职责 |
|------|------|
| `lib/questions.ts` | 题型/题目类型定义 + 示例题库（静态数据） |
| `lib/grading.ts` | 纯函数 `grade()`：单选/多选/判断判分，填空返回 `null` |
| `lib/progress.ts` | `Progress`/`UserAnswer` 类型 + 纯辅助（`createEmptyProgress`/`normalizeProgress`/`isComplete`/`STORAGE_KEY`） |
| `lib/useProgress.ts` | 进度读写 hook（封装 localStorage，client 图内） |
| `components/QuestionCard.tsx` | 按题型渲染单题、收集作答、提交后展示结果 |
| `components/Summary.tsx` | 刷完后的小结（正确率、错题数） |
| `app/page.tsx` | 首页：开始/继续/重置 |
| `app/practice/page.tsx` | 刷题页：按 `currentIndex` 取题，串起 QuestionCard / Summary |
| `app/layout.tsx` | 根布局（仅更新 metadata 标题与 lang） |

依赖顺序：questions(1) → grading(2) → progress(3) → useProgress(4) → QuestionCard(5) → Summary(6) → home(7) → practice(8) → layout(9) → 验证(10)。

---

### Task 1: 题库数据层 `lib/questions.ts`

**Files:**
- Create: `lib/questions.ts`

**Interfaces:**
- Produces: `QuestionType`、`Question`、`questions: Question[]`（后续任务 import）

- [ ] **Step 1: 创建题库类型与示例数据**

```ts
// lib/questions.ts
export type QuestionType = 'single' | 'multiple' | 'judge' | 'fill'

export interface Question {
  id: string
  type: QuestionType
  stem: string
  options?: string[]
  answer: string | string[]
  explanation?: string
}

export const questions: Question[] = [
  {
    id: 'q1',
    type: 'single',
    stem: '线性代数中，矩阵乘法一般不满足下列哪一条性质？',
    options: ['结合律', '分配律', '对加法的分配律', '交换律'],
    answer: '交换律',
    explanation: '矩阵乘法一般不满足交换律，即 AB 通常不等于 BA。',
  },
  {
    id: 'q2',
    type: 'single',
    stem: '二进制数 1010 对应的十进制数是？',
    options: ['8', '10', '12', '16'],
    answer: '10',
    explanation: '1010(2) = 1×8 + 0×4 + 1×2 + 0×1 = 10。',
  },
  {
    id: 'q3',
    type: 'single',
    stem: 'Choose the correct past tense: He ___ to school yesterday.',
    options: ['go', 'goes', 'went', 'gone'],
    answer: 'went',
    explanation: 'yesterday 表过去，go 的过去式是 went。',
  },
  {
    id: 'q4',
    type: 'multiple',
    stem: '下列哪些函数是偶函数？（多选）',
    options: ['x²', 'cos x', '|x|', 'x³'],
    answer: ['x²', 'cos x', '|x|'],
    explanation: '偶函数满足 f(-x)=f(x)：x²、cos x、|x| 均满足；x³ 是奇函数。',
  },
  {
    id: 'q5',
    type: 'multiple',
    stem: '下列哪些语言支持面向对象编程？（多选）',
    options: ['Java', 'C++', 'Python', 'C'],
    answer: ['Java', 'C++', 'Python'],
    explanation: 'C 是面向过程语言；Java、C++、Python 均支持面向对象。',
  },
  {
    id: 'q6',
    type: 'multiple',
    stem: '关于进程与线程，下列说法正确的有哪些？（多选）',
    options: [
      '进程是资源分配的基本单位',
      '线程是 CPU 调度的基本单位',
      '同一进程内的线程共享内存空间',
      '一个进程只能包含一个线程',
    ],
    answer: ['进程是资源分配的基本单位', '线程是 CPU 调度的基本单位', '同一进程内的线程共享内存空间'],
    explanation: '一个进程可以包含多个线程，故最后一项错误。',
  },
  {
    id: 'q7',
    type: 'judge',
    stem: '若函数在某点可导，则它在该点必定连续。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: '可导必连续，连续不一定可导。',
  },
  {
    id: 'q8',
    type: 'judge',
    stem: 'HTTP 是一种无状态（stateless）协议。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: 'HTTP 本身不保存前后请求的状态，需借助 Cookie/Session 维持状态。',
  },
  {
    id: 'q9',
    type: 'judge',
    stem: '英文单词 "information" 是不可数名词。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: 'information 没有复数形式，是不可数名词。',
  },
  {
    id: 'q10',
    type: 'fill',
    stem: '不定积分 ∫2x dx = ？（请写出含任意常数 C 的结果）',
    answer: ['x^2 + C', 'x² + C'],
    explanation: '∫2x dx = x² + C。',
  },
  {
    id: 'q11',
    type: 'fill',
    stem: 'TCP 建立连接需要三次握手，释放连接需要 ___ 次握手。',
    answer: ['4', '四'],
    explanation: 'TCP 释放连接需要四次握手（FIN/ACK 各两次）。',
  },
  {
    id: 'q12',
    type: 'fill',
    stem: '马克思主义哲学的直接理论来源中，主要是黑格尔的辩证法和 ___ 的唯物主义。',
    answer: ['费尔巴哈'],
    explanation: '马克思批判吸收了费尔巴哈的唯物主义与黑格尔的辩证法。',
  },
  {
    id: 'q13',
    type: 'single',
    stem: '抛一枚均匀硬币两次，至少出现一次正面的概率是？',
    options: ['1/4', '1/2', '3/4', '1'],
    answer: '3/4',
    explanation: '样本空间 4 种，仅"反反"无正面，故概率 = 3/4。',
  },
  {
    id: 'q14',
    type: 'judge',
    stem: '行列式为 0 的方阵一定不可逆。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: '方阵可逆当且仅当其行列式不为 0。',
  },
  {
    id: 'q15',
    type: 'multiple',
    stem: '下列哪些是英语连词（conjunction）？（多选）',
    options: ['because', 'although', 'quickly', 'if'],
    answer: ['because', 'although', 'if'],
    explanation: 'quickly 是副词；because/although/if 是连词。',
  },
]
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: 无报错（仅新增自包含文件）

- [ ] **Step 3: 提交**

```bash
git add lib/questions.ts
git commit -m "feat: add question types and sample bank"
```

---

### Task 2: 判分纯函数 `lib/grading.ts`

**Files:**
- Create: `lib/grading.ts`

**Interfaces:**
- Consumes: `Question`、`QuestionType`（来自 `lib/questions.ts`）
- Produces: `UserValue` 类型、`grade(type, userValue, question)` 供 `lib/useProgress.ts` 与 `components/QuestionCard.tsx` 使用

- [ ] **Step 1: 实现 grade**

```ts
// lib/grading.ts
import type { Question, QuestionType } from './questions'

export type UserValue = string | string[]

export function grade(type: QuestionType, userValue: UserValue, question: Question): boolean | null {
  if (type === 'fill') return null
  if (type === 'multiple') {
    const selected = Array.isArray(userValue) ? userValue : []
    const correct = question.answer as string[]
    if (selected.length !== correct.length) return false
    return correct.every((a) => selected.includes(a))
  }
  // single / judge
  return userValue === question.answer
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS（无报错）

- [ ] **Step 3: 提交**

```bash
git add lib/grading.ts
git commit -m "feat: add grading pure function"
```

---

### Task 3: 进度类型与纯辅助 `lib/progress.ts`

**Files:**
- Create: `lib/progress.ts`

**Interfaces:**
- Consumes: `QuestionType`（来自 `lib/questions.ts`）
- Produces: `UserAnswer`、`Progress`、`STORAGE_KEY`、`createEmptyProgress()`、`normalizeProgress()`、`isComplete()` 供 `lib/useProgress.ts` 与 `components/Summary.tsx` 使用

- [ ] **Step 1: 实现进度类型与辅助**

```ts
// lib/progress.ts
import type { QuestionType } from './questions'

export interface UserAnswer {
  questionId: string
  type: QuestionType
  value: string | string[]
  correct: boolean | null
}

export interface Progress {
  currentIndex: number
  answers: Record<string, UserAnswer>
  wrongIds: string[]
  updatedAt: number
}

export const STORAGE_KEY = 'quiz-progress-v1'

export function createEmptyProgress(): Progress {
  return { currentIndex: 0, answers: {}, wrongIds: [], updatedAt: 0 }
}

export function isComplete(p: Progress, total: number): boolean {
  return p.currentIndex >= total
}

export function normalizeProgress(raw: unknown, total: number): Progress {
  if (!raw || typeof raw !== 'object') return createEmptyProgress()
  const obj = raw as Partial<Progress>
  if (typeof obj.currentIndex !== 'number') return createEmptyProgress()
  const currentIndex = Math.min(Math.max(0, Math.floor(obj.currentIndex)), total)
  const answers =
    obj.answers && typeof obj.answers === 'object' ? obj.answers : {}
  const wrongIds = Array.isArray(obj.wrongIds)
    ? obj.wrongIds.filter((x): x is string => typeof x === 'string')
    : []
  const updatedAt = typeof obj.updatedAt === 'number' ? obj.updatedAt : 0
  return { currentIndex, answers, wrongIds, updatedAt }
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add lib/progress.ts
git commit -m "feat: add progress types and helpers"
```

---

### Task 4: 进度 hook `lib/useProgress.ts`

**Files:**
- Create: `lib/useProgress.ts`

**Interfaces:**
- Consumes: `questions`（来自 `lib/questions.ts`）、`grade`/`UserValue`（来自 `lib/grading.ts`）、`Progress`/`createEmptyProgress`/`normalizeProgress`/`isComplete`/`STORAGE_KEY`（来自 `lib/progress.ts`）
- Produces: `useProgress()` 返回 `{ progress, hydrated, total, isComplete, submitAnswer, next, reset }`，供 `app/page.tsx` 与 `app/practice/page.tsx` 使用

- [ ] **Step 1: 实现 useProgress**

```ts
// lib/useProgress.ts
import { useCallback, useEffect, useState } from 'react'
import { questions } from '@/lib/questions'
import { grade, type UserValue } from '@/lib/grading'
import {
  createEmptyProgress,
  isComplete,
  normalizeProgress,
  STORAGE_KEY,
  type Progress,
} from '@/lib/progress'

const TOTAL = questions.length

export function useProgress() {
  const [progress, setProgress] = useState<Progress>(createEmptyProgress())
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : null
      setProgress(normalizeProgress(parsed, TOTAL))
    } catch {
      setProgress(createEmptyProgress())
    } finally {
      setHydrated(true)
    }
  }, [])

  const submitAnswer = useCallback((questionIndex: number, value: UserValue) => {
    setProgress((prev) => {
      const q = questions[questionIndex]
      const correct = grade(q.type, value, q)
      const userAnswer = { questionId: q.id, type: q.type, value, correct }
      const answers = { ...prev.answers, [q.id]: userAnswer }
      const wrongIds =
        correct === false && !prev.wrongIds.includes(q.id)
          ? [...prev.wrongIds, q.id]
          : prev.wrongIds
      const next: Progress = { ...prev, answers, wrongIds, updatedAt: Date.now() }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } catch {
        /* 忽略写入失败（如隐私模式） */
      }
      return next
    })
  }, [])

  const next = useCallback(() => {
    setProgress((prev) => {
      const nextIndex = Math.min(prev.currentIndex + 1, TOTAL)
      const updated: Progress = { ...prev, currentIndex: nextIndex, updatedAt: Date.now() }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
      } catch {
        /* 忽略写入失败 */
      }
      return updated
    })
  }, [])

  const reset = useCallback(() => {
    const empty = createEmptyProgress()
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* 忽略 */
    }
    setProgress(empty)
  }, [])

  return {
    progress,
    hydrated,
    total: TOTAL,
    isComplete: isComplete(progress, TOTAL),
    submitAnswer,
    next,
    reset,
  }
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add lib/useProgress.ts
git commit -m "feat: add useProgress hook with localStorage"
```

---

### Task 5: 单题卡片 `components/QuestionCard.tsx`

**Files:**
- Create: `components/QuestionCard.tsx`

**Interfaces:**
- Consumes: `Question`（来自 `lib/questions.ts`）、`UserValue`（来自 `lib/grading.ts`）
- Produces: 默认导出 `QuestionCard`，供 `app/practice/page.tsx` 使用。Props：`question`、`index`、`total`、`initialValue?`、`onSubmit(value)`、`onNext()`

- [ ] **Step 1: 实现 QuestionCard**

```tsx
// components/QuestionCard.tsx
'use client'
import { useState } from 'react'
import type { Question } from '@/lib/questions'
import type { UserValue } from '@/lib/grading'

interface Props {
  question: Question
  index: number
  total: number
  initialValue?: UserValue
  onSubmit: (value: UserValue) => void
  onNext: () => void
}

export default function QuestionCard({
  question,
  index,
  total,
  initialValue,
  onSubmit,
  onNext,
}: Props) {
  const [value, setValue] = useState<UserValue>(
    initialValue ?? (question.type === 'multiple' ? [] : ''),
  )
  const [submitted, setSubmitted] = useState(false)

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
  if (q.type === 'fill') return false
  if (q.type === 'multiple') {
    const v = Array.isArray(value) ? value : []
    const a = q.answer as string[]
    return v.length !== a.length || !a.every((x) => v.includes(x))
  }
  return value !== q.answer
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add components/QuestionCard.tsx
git commit -m "feat: add QuestionCard component"
```

---

### Task 6: 小结组件 `components/Summary.tsx`

**Files:**
- Create: `components/Summary.tsx`

**Interfaces:**
- Consumes: `Progress`（来自 `lib/progress.ts`）、`questions`（来自 `lib/questions.ts`）
- Produces: 默认导出 `Summary`，Props：`progress`、`onRestart()`，供 `app/practice/page.tsx` 使用

- [ ] **Step 1: 实现 Summary**

```tsx
// components/Summary.tsx
'use client'
import type { Progress } from '@/lib/progress'
import { questions } from '@/lib/questions'

interface Props {
  progress: Progress
  onRestart: () => void
}

export default function Summary({ progress, onRestart }: Props) {
  const graded = Object.values(progress.answers).filter((a) => a.correct !== null)
  const correctCount = graded.filter((a) => a.correct === true).length
  const accuracy = graded.length ? Math.round((correctCount / graded.length) * 100) : 0

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <h2 className="mb-4 text-xl font-semibold">本次刷题完成 🎉</h2>
      <ul className="mb-5 space-y-2 text-sm">
        <li>总题数：{questions.length}</li>
        <li>已作答：{Object.keys(progress.answers).length}</li>
        <li>
          自动判分题正确率：{accuracy}%（{correctCount}/{graded.length}）
        </li>
        <li>错题数：{progress.wrongIds.length}</li>
      </ul>
      <button
        type="button"
        onClick={onRestart}
        className="rounded-xl bg-blue-600 px-5 py-2.5 font-medium text-white"
      >
        重新开始
      </button>
    </div>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add components/Summary.tsx
git commit -m "feat: add Summary component"
```

---

### Task 7: 首页 `app/page.tsx`

**Files:**
- Modify: `app/page.tsx`（整体替换）

**Interfaces:**
- Consumes: `useProgress()`（来自 `lib/useProgress.ts`）
- Produces: 首页 UI，链接到 `/practice`

- [ ] **Step 1: 替换首页**

```tsx
// app/page.tsx
'use client'
import Link from 'next/link'
import { useProgress } from '@/lib/useProgress'

export default function Home() {
  const { progress, total, hydrated, isComplete, reset } = useProgress()
  const answered = Object.keys(progress.answers).length
  const inProgress = hydrated && !isComplete && answered > 0

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">大学生刷题</h1>
      <p className="mb-8 text-zinc-500">
        按题库顺序逐题练习，提交看解析，进度自动保存在本地。
      </p>

      {!hydrated ? null : inProgress ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">
            已做 {answered} / 共 {total}，继续上次进度。
          </p>
          <Link
            href="/practice"
            className="rounded-xl bg-blue-600 px-5 py-3 text-center font-medium text-white"
          >
            继续刷题
          </Link>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-center font-medium dark:border-zinc-700"
          >
            重新开始
          </button>
        </div>
      ) : (
        <Link
          href="/practice"
          className="rounded-xl bg-blue-600 px-5 py-3 text-center font-medium text-white"
        >
          {answered > 0 ? '再刷一次' : '开始刷题'}
        </Link>
      )}

      {total === 0 && (
        <p className="mt-6 text-sm text-amber-600">
          暂无题目，请在 lib/questions.ts 中导入题库。
        </p>
      )}
    </main>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add app/page.tsx
git commit -m "feat: add home page with start/continue/reset"
```

---

### Task 8: 刷题页 `app/practice/page.tsx`

**Files:**
- Create: `app/practice/page.tsx`

**Interfaces:**
- Consumes: `useProgress()`（来自 `lib/useProgress.ts`）、`questions`（来自 `lib/questions.ts`）、`QuestionCard`（来自 `components/QuestionCard.tsx`）、`Summary`（来自 `components/Summary.tsx`）

- [ ] **Step 1: 创建刷题页**

```tsx
// app/practice/page.tsx
'use client'
import Link from 'next/link'
import { useProgress } from '@/lib/useProgress'
import { questions } from '@/lib/questions'
import QuestionCard from '@/components/QuestionCard'
import Summary from '@/components/Summary'

export default function PracticePage() {
  const { progress, total, isComplete, submitAnswer, next, reset } = useProgress()
  const i = progress.currentIndex

  if (isComplete) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <Summary progress={progress} onRestart={reset} />
        <Link href="/" className="mt-4 block text-center text-sm text-blue-600">
          返回首页
        </Link>
      </main>
    )
  }

  const question = questions[i]
  if (!question) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center text-zinc-500">
        题库为空或进度异常，
        <Link href="/" className="text-blue-600">
          返回首页
        </Link>
      </main>
    )
  }

  const saved = progress.answers[question.id]?.value

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="mb-4 inline-block text-sm text-blue-600">
        ← 退出（进度已保存）
      </Link>
      <QuestionCard
        question={question}
        index={i}
        total={total}
        initialValue={saved}
        onSubmit={(value) => submitAnswer(i, value)}
        onNext={next}
      />
    </main>
  )
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add app/practice/page.tsx
git commit -m "feat: add practice page wiring session together"
```

---

### Task 9: 更新根布局 metadata `app/layout.tsx`

**Files:**
- Modify: `app/layout.tsx`（改 `lang` 与 `metadata`）

**Interfaces:**
- 仅文案/元数据调整，无新接口

- [ ] **Step 1: 更新 lang 与 title**

将 `app/layout.tsx` 中：
- `<html lang="en" ...>` 改为 `<html lang="zh-CN" ...>`
- `metadata` 的 `title` 改为 `'大学生刷题'`，`description` 改为 `'按题库顺序逐题练习，提交看解析，进度本地保存。'`

```tsx
// app/layout.tsx（改动片段）
export const metadata: Metadata = {
  title: '大学生刷题',
  description: '按题库顺序逐题练习，提交看解析，进度本地保存。',
};
```

（其余 layout 内容保持不变。）

- [ ] **Step 2: 类型检查**

Run: `pnpm exec tsc --noEmit`
Expected: PASS

- [ ] **Step 3: 提交**

```bash
git add app/layout.tsx
git commit -m "chore: set Chinese lang and title metadata"
```

---

### Task 10: 整体构建与手动走查

**Files:** 无新增，验证既有全部改动

- [ ] **Step 1: 生产构建（类型检查 + 编译闸门）**

Run: `pnpm build`
Expected: 编译成功，无类型错误；输出包含 `/` 与 `/practice` 两个路由。

- [ ] **Step 2: 手动走查（在浏览器 `pnpm dev` 中进行）**

启动 `pnpm dev`，逐项确认：
1. 首页显示"开始刷题"。
2. 进入 `/practice`：逐题作答 → 点"提交" → 显示对错/参考答案+解析；填空/简答显示参考答案且提示自行对照。
3. 多选题需全选对才判对；错题高亮红、正确项高亮绿。
4. 点"下一题"进入下一题；答错的题进入错题本。
5. 中途点"退出"返回首页 → 首页显示"继续刷题（已做 X / 共 Y）"。
6. 重新进入 `/practice` 从上次进度继续，已答题若有作答则预填。
7. 刷完所有题 → 显示小结（正确率、错题数）→ 点"重新开始"清空进度。
8. 首页点"重新开始"后进度清空。
9. 清空 `lib/questions.ts`（`questions = []`）时首页提示"暂无题目"，`/practice` 提示返回首页。

- [ ] **Step 3: 提交（如有微调）**

若走查中发现需微调，改完提交：
```bash
git add -A
git commit -m "fix: adjust quiz UI per walkthrough"
```
若无需改动，跳过此步。

---

## 自检（Spec 覆盖核对）

- §1 纯客户端/无后端/无登录/平铺题库/导入后置 → Task 1–9 全部 client 组件，无 API；导入功能未实现（后置）。
- §3 四类题型 → Task 1 数据 + Task 2 判分 + Task 5 渲染全覆盖。
- §4 填空不自判 → Task 2 `grade` 返回 `null`；Task 5 仅显示参考答案不判对错；Task 6 正确率仅统计 `correct !== null`。
- §5 localStorage 进度/续刷/越界 clamp → Task 3 `normalizeProgress` + Task 4 hook 落盘。
- §8 异常处理（题库空、localStorage 损坏、越界）→ Task 3 解析容错、Task 7/8 空题库提示、Task 3 clamp。
- §9 示例数据 10–15 道覆盖四类 → Task 1 共 15 道。
- §10 不写自动化测试 → 验证用 `tsc --noEmit` + `pnpm build` + 手动走查（Task 10）。

无占位符、无歧义、类型在任务间一致（`Question`/`UserValue`/`Progress` 定义与引用一致）。
