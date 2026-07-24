import type { Question, QuestionType } from './questions'

export interface CsvParseResult {
  questions: Question[]
  errors: string[]
}

// 解析 CSV：列顺序 id, type, subject, stem, options, answer, explanation
// options 与多选/填空的 answer 用 | 分隔；首行若为表头则跳过
export function parseCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  const errors: string[] = []
  const questions: Question[] = []
  if (lines.length === 0) return { questions, errors: ['CSV 内容为空'] }
  let start = 0
  if (/^id\s*,?\s*type/i.test(lines[0])) start = 1
  for (let i = start; i < lines.length; i++) {
    const cols = lines[i].split(',').map((c) => c.trim())
    const [id, type, subject, stem, optionsStr, answerStr, explanation] = cols
    if (!id || !type || !subject || !stem) {
      errors.push(`第 ${i + 1} 行缺少必填字段（id/type/subject/stem）`)
      continue
    }
    const opts = optionsStr
      ? optionsStr.split('|').map((s) => s.trim()).filter(Boolean)
      : undefined
    let answer: string | string[]
    if (type === 'multiple' || type === 'fill') {
      answer = answerStr
        ? answerStr.split('|').map((s) => s.trim()).filter(Boolean)
        : []
    } else {
      answer = answerStr ?? ''
    }
    questions.push({
      id,
      type: type as QuestionType,
      subject,
      stem,
      options: opts,
      answer,
      explanation: explanation || undefined,
    })
  }
  return { questions, errors }
}
