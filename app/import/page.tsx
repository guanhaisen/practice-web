'use client'
import { useState, type ChangeEvent } from 'react'
import Link from 'next/link'
import {
  validateBank,
  mergeBank,
  clearBank,
  hasImportedBank,
  type BankResult,
} from '@/lib/bank'
import { applyBackup } from '@/lib/backup'
import { parseCsv } from '@/lib/csv'
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

const CSV_TEMPLATE = `id,type,subject,stem,options,answer,explanation
q1,single,math-1,1+1等于几,1|2|3,2,基础加法示例
q2,multiple,math-1,下列哪些是偶数,1|2|3|4,2|4,
q3,judge,math-1,2是偶数,正确|错误,正确,判断示例
q4,fill,math-1,1+1=__,2,填空示例`

export default function ImportPage() {
  const [text, setText] = useState('')
  const [result, setResult] = useState<BankResult | null>(null)
  const [saved, setSaved] = useState(false)
  const [imported, setImported] = useState(hasImportedBank())
  const [restored, setRestored] = useState(false)
  const [csvText, setCsvText] = useState('')

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
    mergeBank(result.questions)
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

  function handleRestore(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    f.text()
      .then((t) => {
        let parsed: unknown
        try {
          parsed = JSON.parse(t)
        } catch {
          throw new Error('文件不是合法 JSON')
        }
        applyBackup(parsed)
        setImported(hasImportedBank())
        setRestored(true)
      })
      .catch((err) => {
        alert('恢复失败：' + (err instanceof Error ? err.message : '文件格式错误'))
      })
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'quiz-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function parseCsvBtn() {
    const { questions, errors } = parseCsv(csvText)
    if (errors.length > 0) {
      setResult({ ok: false, errors, questions: [] })
      return
    }
    setResult(validateBank(questions))
  }

  const dist = result?.ok
    ? result.questions.reduce<Record<string, number>>((acc, q) => {
        acc[q.subject] = (acc[q.subject] ?? 0) + 1
        return acc
      }, {})
    : null
  const newSubjectIds = result?.ok
    ? Array.from(new Set(result.questions.map((q) => q.subject)))
    : []
  const keptSubjects = subjects.filter((s) => !newSubjectIds.includes(s.id))

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="text-sm text-accent">
        ← 返回首页
      </Link>
      <h1 className="mb-2 mt-2 text-3xl font-bold tracking-tight text-ink">导入题库</h1>
      <p className="mb-6 text-muted">
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
        className="h-48 w-full rounded-xl border border-line p-3 font-mono text-sm outline-none focus:border-accent bg-surface"
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
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          校验
        </button>
      </div>

      <details className="mt-4 text-sm text-muted">
        <summary className="cursor-pointer">查看 JSON 格式说明</summary>
        <pre className="mt-2 overflow-x-auto rounded-lg bg-surface-2 p-3 text-xs">
          {FORMAT_HINT}
        </pre>
        <p className="mt-2">
          可选科目 id：{subjects.map((s) => s.id).join('、')}、{GENERAL_SUBJECT}
        </p>
      </details>

      <div className="mt-6 border-t border-line pt-6">
        <h2 className="mb-2 text-lg font-semibold">或用 CSV 批量导入</h2>
        <p className="mb-3 text-sm text-muted">
          列顺序：id, type, subject, stem, options, answer, explanation。多选/填空的
          options 与 answer 用
          <code className="mx-1 rounded bg-surface-2 px-1">|</code>
          分隔；首行可为表头。
        </p>
        <button
          type="button"
          onClick={downloadTemplate}
          className="mb-3 rounded-lg border border-line-strong px-3 py-1.5 text-sm text-ink"
        >
          下载 CSV 模板
        </button>
        <textarea
          value={csvText}
          onChange={(e) => {
            setCsvText(e.target.value)
            setResult(null)
            setSaved(false)
          }}
          placeholder="在此粘贴 CSV 文本…"
          className="h-40 w-full rounded-xl border border-line p-3 font-mono text-sm outline-none focus:border-accent bg-surface"
        />
        <button
          type="button"
          onClick={parseCsvBtn}
          className="mt-3 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          解析 CSV
        </button>
      </div>

      {result && !result.ok && (
        <div className="mt-4 rounded-xl border border-danger bg-danger-soft p-4 text-sm text-danger">
          <p className="mb-1 font-medium">校验未通过：</p>
          <ul className="list-disc pl-5">
            {result.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result?.ok && (
        <div className="mt-4 rounded-xl border border-success bg-success-soft p-4 text-sm">
          <p className="mb-2 font-medium text-success">
            校验通过，共 {result.questions.length} 题
          </p>
          {dist && (
            <ul className="space-y-1 text-xs text-muted">
              {Object.entries(dist).map(([sid, n]) => (
                <li key={sid}>
                  {subjectName(sid)}：{n} 题
                </li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-xs text-muted">
            将按科目覆盖以上 {newSubjectIds.length} 个科目；其余科目（
            {keptSubjects.map((s) => s.name).join('、') || '无'}）保留当前内容。
          </p>
          <p className="mt-1 text-xs text-muted">
            ⚠ 导入会整科替换，并清理这些科目中已不存在题目的进度与星标。
          </p>
          <button
            type="button"
            onClick={save}
            className="mt-3 rounded-xl bg-accent px-4 py-2 font-medium text-white transition-colors hover:bg-accent-hover"
          >
            保存到本地
          </button>
        </div>
      )}

      {saved && (
        <p className="mt-3 text-sm text-success">已保存，可返回首页开始练习。</p>
      )}

      <div className="mt-6 flex gap-3">
        <Link
          href="/"
          className="rounded-xl border border-line-strong px-5 py-2.5 font-medium text-accent transition-colors hover:border-accent"
        >
          开始练习
        </Link>
        {imported && (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl border border-danger px-5 py-2.5 font-medium text-danger transition-colors hover:border-danger"
          >
            清除导入（恢复示例）
          </button>
        )}
      </div>

      <div className="mt-6 border-t border-line pt-6">
        <p className="mb-2 text-sm text-muted">
          从备份文件恢复（覆盖题库 / 进度 / 选科 / 星标）：
        </p>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleRestore}
          className="text-sm"
        />
        {restored && (
          <p className="mt-2 text-sm text-success">
            已从备份恢复，建议刷新页面查看。
          </p>
        )}
      </div>
    </main>
  )
}
