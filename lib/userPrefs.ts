import { subjects } from './subjects'

export const SUBJECTS_KEY = 'quiz-subjects-v1'

const validIds = new Set(subjects.map((s) => s.id))

// 返回 null 表示用户从未选过科目（首次进入）；返回数组表示已选（可能为空，但正常不会）
export function loadSelectedSubjects(): string[] | null {
  try {
    const raw = localStorage.getItem(SUBJECTS_KEY)
    if (raw === null) return null
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return null
    return parsed.filter((x): x is string => typeof x === 'string' && validIds.has(x))
  } catch {
    return null
  }
}

export function saveSelectedSubjects(ids: string[]): void {
  try {
    localStorage.setItem(SUBJECTS_KEY, JSON.stringify(ids))
  } catch {
    /* 忽略写入失败（如隐私模式） */
  }
}
