export interface HistoryEntry {
  id: string
  subject: string
  mode: string // all | wrong | flags
  total: number
  answered: number
  correct: number
  accuracy: number // 0~1
  missed: string[] // 本次答错的题 id
  at: number // 时间戳
}

const HISTORY_KEY = 'quiz-history-v1'
const MAX_ENTRIES = 200

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (raw) return JSON.parse(raw) as HistoryEntry[]
  } catch {
    /* 忽略 */
  }
  return []
}

export function recordHistory(input: {
  subject: string
  mode: string
  total: number
  answered: number
  correct: number
  missed: string[]
}): HistoryEntry {
  const entries = loadHistory()
  const accuracy = input.total > 0 ? input.correct / input.total : 0
  const entry: HistoryEntry = {
    id: `h-${Date.now()}-${Math.floor(Math.random() * 1e6)}`,
    at: Date.now(),
    accuracy,
    ...input,
  }
  entries.unshift(entry)
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_ENTRIES)))
  } catch {
    /* 忽略写入失败 */
  }
  return entry
}

export interface SubjectStat {
  subject: string
  total: number
  correct: number
  accuracy: number
}

// 按科目聚合历史，返回正确率升序（最弱在前）
export function weaknessBySubject(entries: HistoryEntry[]): SubjectStat[] {
  const map = new Map<string, { total: number; correct: number }>()
  for (const e of entries) {
    const cur = map.get(e.subject) ?? { total: 0, correct: 0 }
    cur.total += e.total
    cur.correct += e.correct
    map.set(e.subject, cur)
  }
  const stats: SubjectStat[] = []
  for (const [subject, v] of map.entries()) {
    stats.push({
      subject,
      total: v.total,
      correct: v.correct,
      accuracy: v.total > 0 ? v.correct / v.total : 0,
    })
  }
  stats.sort((a, b) => a.accuracy - b.accuracy)
  return stats
}

export interface QuestionStat {
  id: string
  count: number
}

// 跨历史聚合每题错误次数，返回降序（反复错在前）
export function weaknessByQuestion(entries: HistoryEntry[]): QuestionStat[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    for (const id of e.missed ?? []) {
      map.set(id, (map.get(id) ?? 0) + 1)
    }
  }
  const stats: QuestionStat[] = []
  for (const [id, count] of map.entries()) {
    stats.push({ id, count })
  }
  stats.sort((a, b) => b.count - a.count)
  return stats
}
