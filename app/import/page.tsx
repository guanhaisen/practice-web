'use client'
import { useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import {
  validateBank,
  saveBank,
  clearBank,
  hasImportedBank,
  type BankResult,
} from '@/lib/bank'
import { subjects, subjectName, GENERAL_SUBJECT } from '@/lib/subjects'

const FORMAT_HINT = `[
  {
    "id": "q1",
    "type": "single",        // single | multiple | judge | fill
    "subject": "math-1",     // 科目 id，见下方列表
    "stem": "题干",
    "options": ["A", "B"],   // 单选/多选/判断必填；填空可不填
    "answer": "B",           // 单选/判断为字符串；多选/填空为数组
    "explanation": "解析（可选）"
  }
]`

export default function ImportPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<BankResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [imported, setImported] = useState(hasImportedBank())

  function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text().then((t) => {
      setText(t)
      setResult(null)
      setSaved(false)
    })
  }

  function validate() {
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch {
      setResult({
        ok: false,
        errors: ['JSON 解析失败，请检查格式（注意引号需为双引号、逗号）'],
        questions: [],
      })
      return
    }
    setResult(validateBank(parsed))
  }

  function save() {
    if (!result?.ok) return
    saveBank(result.questions)
    setImported(true)
    setSaved(true)
  }

  function clear() {
    clearBank()
    setImported(false)
    setSaved(false)
    setText('')
    setResult(null)
  }

  const dist = result?.ok
    ? result.questions.reduce<Record<string, number>>((acc, q) => {
        acc[q.subject] = (acc[q.subject] ?? 0) + 1
        return acc
      }, {})
    : null

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-blue-600">
        ← 返回首页
      </Link>
      <h1 className="mb-2 mt-2 text-3xl font-bold tracking-tight">导入题库</h1>
      <p className="mb-6 text-zinc-500">
        粘贴或上传题目 JSON，校验通过后保存到本地；之后刷题将使用导入的题库，覆盖内置示例。
      </p>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setResult(null)
          setSaved(false)
        }}
        placeholder="在此粘贴题目 JSON 数组…"
        className="h-48 w-full rounded-xl border border-zinc-300 p-3 font-mono text-sm outline-none focus:border-blue-500 dark:border-zinc-700 dark:bg-zinc-800"
      />
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFile}
          className="text-sm"
        />
        <button
          type="button"
          onClick={validate}
          className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white"
        >
          校验
        </button>
      </div>

      <details className="mt-4 text-sm text-zinc-500">
        <summary className="cursor-pointer">查看 JSON 格式说明</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-100 p-3 text-xs dark:bg-zinc-800">
          {FORMAT_HINT}
        </pre>
        <p className="mt-2">
          可选科目 id：{subjects.map((s) => s.id).join('、')}、{GENERAL_SUBJECT}
        </p>
      </details>

      {result && !result.ok && (
        <div className="mt-4 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:bg-red-950">
          <p className="mb-1 font-medium">校验未通过：</p>
          <ul className="list-disc pl-5">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.ok && (
        <div className="mt-4 rounded-xl border border-green-300 bg-green-50 p-4 text-sm dark:bg-green-950">
          <p className="mb-2 font-medium text-green-700">
            校验通过，共 {result.questions.length} 题
          </p>
          {dist && (
            <ul className="space-y-1 text-xs text-zinc-600">
              {Object.entries(dist).map(([sid, n]) => (
                <li key={sid}>
                  {subjectName(sid)}：{n} 题
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={save}
            className="mt-3 rounded-xl bg-blue-600 px-4 py-2 font-medium text-white"
          >
            保存到本地
          </button>
        </div>
      )}

      {saved && (
        <p className="mt-3 text-sm text-green-600">已保存，可返回首页开始练习。</p>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-xl border border-zinc-300 px-5 py-2.5 font-medium text-blue-600 dark:border-zinc-700"
        >
          开始练习
        </Link>
        {imported && (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl border border-red-300 px-5 py-2.5 font-medium text-red-600 dark:border-red-700"
          >
            清除导入（恢复示例）
          </button>
        )}
      </div>
    </main>
  )
}
