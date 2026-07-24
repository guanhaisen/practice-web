export interface SrsCard {
  id: string
  due: number // 下次复习时间戳（ms）
  reps: number // 连续记住次数
  lapses: number // 忘记次数
  last: number // 上次复习时间戳
}

const SRS_KEY = 'quiz-srs-v1'

// 简化间隔（天），reps 越大间隔越长
const INTERVALS_DAYS = [1, 3, 7, 16, 35]
const FORGOT_DELAY_MS = 60 * 60 * 1000 // 忘记后 1 小时再练

export function loadSrs(): Record<string, SrsCard> {
  try {
    const raw = localStorage.getItem(SRS_KEY)
    if (raw) return JSON.parse(raw) as Record<string, SrsCard>
  } catch {
    /* 忽略 */
  }
  return {}
}

export function saveSrs(map: Record<string, SrsCard>): void {
  try {
    localStorage.setItem(SRS_KEY, JSON.stringify(map))
  } catch {
    /* 忽略写入失败 */
  }
}

// 复习一张卡：remembered 推进间隔，否则重置并短期再练
export function reviewCard(
  map: Record<string, SrsCard>,
  id: string,
  remembered: boolean,
  now: number,
): Record<string, SrsCard> {
  const cur = map[id] ?? { id, due: 0, reps: 0, lapses: 0, last: 0 }
  let { reps, lapses } = cur
  if (remembered) {
    reps += 1
    const idx = Math.min(reps - 1, INTERVALS_DAYS.length - 1)
    const due = now + INTERVALS_DAYS[idx] * 86400000
    return { ...map, [id]: { ...cur, reps, lapses, due, last: now } }
  }
  reps = 0
  lapses += 1
  return {
    ...map,
    [id]: { ...cur, reps, lapses, due: now + FORGOT_DELAY_MS, last: now },
  }
}

// 某科目当前待复习（due<=now）的题目数
export function dueCountFor(
  bank: { id: string; subject: string }[],
  subjectId: string,
  srs: Record<string, SrsCard>,
  now: number,
): number {
  return bank.filter(
    (q) => q.subject === subjectId && (srs[q.id]?.due ?? 0) <= now,
  ).length
}
