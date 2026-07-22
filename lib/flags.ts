export const FLAGS_KEY = 'quiz-flags-v1'

// 星标（标记难题）按题目 id 全局保存，跨科目
export function loadFlags(): Set<string> {
  try {
    const raw = localStorage.getItem(FLAGS_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((x): x is string => typeof x === 'string'))
    }
  } catch {
    /* 忽略 */
  }
  return new Set()
}

export function saveFlags(flags: Set<string>): void {
  try {
    localStorage.setItem(FLAGS_KEY, JSON.stringify([...flags]))
  } catch {
    /* 忽略 */
  }
}
