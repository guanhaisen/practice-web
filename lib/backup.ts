import type { Question } from './questions'
import { BANK_KEY } from './bank'
import {
  storageKeyFor,
  normalizeProgress,
  type Progress,
} from './progress'
import { SUBJECTS_KEY, loadSelectedSubjects } from './userPrefs'
import { FLAGS_KEY, loadFlags } from './flags'
import { subjects, GENERAL_SUBJECT } from './subjects'

export interface Backup {
  version: number
  bank: Question[] | null
  selected: string[] | null
  flags: string[]
  progress: Record<string, Progress>
}

const BACKUP_VERSION = 1

export function collectBackup(): Backup {
  let bank: Question[] | null = null
  try {
    const raw = localStorage.getItem(BANK_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) bank = parsed as Question[]
    }
  } catch {
    /* 忽略 */
  }
  const selected = loadSelectedSubjects()
  let flags: string[] = []
  try {
    const raw = localStorage.getItem(FLAGS_KEY)
    if (raw) flags = JSON.parse(raw)
  } catch {
    /* 忽略 */
  }
  const progress: Record<string, Progress> = {}
  const allSubjects = [...subjects.map((s) => s.id), GENERAL_SUBJECT]
  for (const sid of allSubjects) {
    try {
      const raw = localStorage.getItem(storageKeyFor(sid))
      if (raw) {
        const p = normalizeProgress(JSON.parse(raw), Number.MAX_SAFE_INTEGER)
        progress[sid] = p
      }
    } catch {
      /* 忽略 */
    }
  }
  return { version: BACKUP_VERSION, bank, selected, flags, progress }
}

export function applyBackup(raw: unknown): void {
  const data = parseBackup(raw)
  try {
    if (data.bank) localStorage.setItem(BANK_KEY, JSON.stringify(data.bank))
  } catch {
    /* 忽略 */
  }
  try {
    if (data.selected) localStorage.setItem(SUBJECTS_KEY, JSON.stringify(data.selected))
  } catch {
    /* 忽略 */
  }
  try {
    if (data.flags) localStorage.setItem(FLAGS_KEY, JSON.stringify(data.flags))
  } catch {
    /* 忽略 */
  }
  try {
    if (data.progress) {
      for (const [sid, p] of Object.entries(data.progress)) {
        localStorage.setItem(storageKeyFor(sid), JSON.stringify(p))
      }
    }
  } catch {
    /* 忽略 */
  }
}

// 校验备份文件结构，非法时抛出明确错误，避免污染本地数据
export function parseBackup(raw: unknown): Backup {
  if (!raw || typeof raw !== 'object') {
    throw new Error('备份文件不是有效的 JSON 对象')
  }
  const o = raw as Record<string, unknown>
  if (typeof o.version !== 'number') {
    throw new Error('备份文件缺少 version 字段或版本无效')
  }
  if (o.bank !== undefined && o.bank !== null && !Array.isArray(o.bank)) {
    throw new Error('bank 字段格式错误')
  }
  if (o.selected !== undefined && o.selected !== null && !Array.isArray(o.selected)) {
    throw new Error('selected 字段格式错误')
  }
  if (o.flags !== undefined && o.flags !== null && !Array.isArray(o.flags)) {
    throw new Error('flags 字段格式错误')
  }
  if (o.progress !== undefined && o.progress !== null && typeof o.progress !== 'object') {
    throw new Error('progress 字段格式错误')
  }
  return {
    version: o.version,
    bank: (o.bank as Question[] | null) ?? null,
    selected: (o.selected as string[] | null) ?? null,
    flags: Array.isArray(o.flags) ? (o.flags as string[]) : [],
    progress: (o.progress as Record<string, Progress>) ?? {},
  }
}

export function downloadBackup(): void {
  const data = collectBackup()
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `quiz-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}
