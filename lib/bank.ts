import { questions as builtinQuestions, type Question } from './questions'
import { subjects, GENERAL_SUBJECT } from './subjects'
import { loadFlags, saveFlags } from './flags'
import { storageKeyFor, normalizeProgress } from './progress'

export const BANK_KEY = 'quiz-bank-v1'
export const VALID_TYPES = ['single', 'multiple', 'judge', 'fill'] as const

const validSubjects = new Set<string>([...subjects.map((s) => s.id), GENERAL_SUBJECT])

export interface BankResult {
  ok: boolean
  errors: string[]
  questions: Question[]
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined
  return v.every((x) => typeof x === 'string') ? (v as string[]) : undefined
}

// 校验导入题库：题目数组，id 唯一，type/subject 合法，answer 与题型匹配
export function validateBank(raw: unknown): BankResult {
  const errors: string[] = []
  if (!Array.isArray(raw)) {
    return { ok: false, errors: ['题库必须是题目数组（JSON 数组）'], questions: [] }
  }
  const ids = new Set<string>()
  const result: Question[] = []
  raw.forEach((item, idx) => {
    const tag = `第 ${idx + 1} 题`
    if (!item || typeof item !== 'object') {
      errors.push(`${tag}：不是合法对象`)
      return
    }
    const q = item as Record<string, unknown>
    if (typeof q.id !== 'string' || !q.id) {
      errors.push(`${tag}：缺少字符串 id`)
      return
    }
    if (ids.has(q.id)) {
      errors.push(`${tag}：id 重复（${q.id}）`)
      return
    }
    ids.add(q.id)

    if (!VALID_TYPES.includes(q.type as (typeof VALID_TYPES)[number])) {
      errors.push(`${tag}：type 必须是 single/multiple/judge/fill`)
    }
    if (typeof q.stem !== 'string' || !q.stem) {
      errors.push(`${tag}：缺少 stem（题干）`)
    }
    if (typeof q.subject !== 'string' || !validSubjects.has(q.subject)) {
      errors.push(`${tag}：subject 必须是已知科目 id`)
    }
    const isArr = Array.isArray(q.answer)
    const isStr = typeof q.answer === 'string'
    if (!isArr && !isStr) {
      errors.push(`${tag}：answer 必须是字符串或数组`)
    } else if (q.type === 'multiple' && !isArr) {
      errors.push(`${tag}：多选题 answer 必须是数组`)
    } else if ((q.type === 'single' || q.type === 'judge') && !isStr) {
      errors.push(`${tag}：单选/判断题 answer 必须是字符串`)
    } else if (q.type === 'fill' && !isArr) {
      errors.push(`${tag}：填空题 answer 必须是数组`)
    }

    result.push({
      id: q.id,
      type: q.type as Question['type'],
      subject: q.subject as string,
      stem: q.stem as string,
      options: asStringArray(q.options),
      answer: q.answer as string | string[],
      explanation: typeof q.explanation === 'string' ? q.explanation : undefined,
    })
  })

  return { ok: errors.length === 0, errors, questions: result }
}

// 优先使用导入题库；无导入或损坏时回退到内置示例
export function loadBank(): Question[] {
  try {
    const raw = localStorage.getItem(BANK_KEY)
    if (!raw) return builtinQuestions
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const res = validateBank(parsed)
      if (res.ok && res.questions.length > 0) return res.questions
    }
    return builtinQuestions
  } catch {
    return builtinQuestions
  }
}

export function saveBank(qs: Question[]): void {
  try {
    localStorage.setItem(BANK_KEY, JSON.stringify(qs))
  } catch {
    /* 忽略写入失败 */
  }
}

export function clearBank(): void {
  try {
    localStorage.removeItem(BANK_KEY)
  } catch {
    /* 忽略 */
  }
}

export function hasImportedBank(): boolean {
  try {
    const raw = localStorage.getItem(BANK_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.length > 0
  } catch {
    return false
  }
}

// 导入后清理各科目进度/星标中已不存在题目的悬空记录，避免错题本与进度错乱
function pruneOrphans(allQs: Question[]) {
  const validIds = new Set(allQs.map((q) => q.id))
  const subjectIds = Array.from(
    new Set([...allQs.map((q) => q.subject), GENERAL_SUBJECT]),
  )
  for (const sid of subjectIds) {
    try {
      const raw = localStorage.getItem(storageKeyFor(sid))
      if (!raw) continue
      const p = normalizeProgress(JSON.parse(raw), Number.MAX_SAFE_INTEGER)
      const wrongIds = p.wrongIds.filter((id) => validIds.has(id))
      const answers: typeof p.answers = {}
      for (const [id, a] of Object.entries(p.answers)) {
        if (validIds.has(id)) answers[id] = a
      }
      const next = { ...p, wrongIds, answers, updatedAt: Date.now() }
      localStorage.setItem(storageKeyFor(sid), JSON.stringify(next))
    } catch {
      /* 忽略 */
    }
  }
  try {
    const flags = loadFlags()
    const kept = new Set([...flags].filter((id) => validIds.has(id)))
    if (kept.size !== flags.size) saveFlags(kept)
  } catch {
    /* 忽略 */
  }
}

// 按科目合并：仅覆盖上传涉及的科目，其余科目（含内置示例）保留
export function mergeBank(newQs: Question[]): Question[] {
  const current = loadBank()
  const newSubjects = new Set(newQs.map((q) => q.subject))
  const kept = current.filter((q) => !newSubjects.has(q.subject))
  const merged = [...kept, ...newQs]
  saveBank(merged)
  pruneOrphans(merged)
  return merged
}
