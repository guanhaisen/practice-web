export interface Subject {
  id: string
  name: string
}

// 用户确认的科目（高等数学上/下、大学英语 I/II/III、党史、马克思主义原理，
// 以及补充的大学物理、线性代数、概率数理统计、思政类四项）
export const subjects: Subject[] = [
  { id: 'math-1', name: '高等数学（上）' },
  { id: 'math-2', name: '高等数学（下）' },
  { id: 'english-1', name: '大学英语 I' },
  { id: 'english-2', name: '大学英语 II' },
  { id: 'english-3', name: '大学英语 III' },
  { id: 'party-history', name: '党史' },
  { id: 'marxism', name: '马克思主义原理' },
  { id: 'physics', name: '大学物理' },
  { id: 'linear-algebra', name: '线性代数' },
  { id: 'probability', name: '概率数理统计' },
  { id: 'ethics', name: '思想道德与法治' },
  { id: 'modern-history', name: '中国近现代史纲要' },
  { id: 'mao-thought', name: '毛泽东思想和中国特色社会主义理论体系概论' },
  { id: 'policy', name: '形势与政策' },
]

// 综合练习：保留全部示例题，不按科目筛选（兜底入口）
export const GENERAL_SUBJECT = 'general'
export const GENERAL_NAME = '综合练习'

export function subjectName(id: string): string {
  if (id === GENERAL_SUBJECT) return GENERAL_NAME
  return subjects.find((s) => s.id === id)?.name ?? id
}
