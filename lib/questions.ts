export type QuestionType = 'single' | 'multiple' | 'judge' | 'fill'

export interface Question {
  id: string
  type: QuestionType
  stem: string
  options?: string[]
  answer: string | string[]
  explanation?: string
}

export const questions: Question[] = [
  {
    id: 'q1',
    type: 'single',
    stem: '线性代数中，矩阵乘法一般不满足下列哪一条性质？',
    options: ['结合律', '分配律', '对加法的分配律', '交换律'],
    answer: '交换律',
    explanation: '矩阵乘法一般不满足交换律，即 AB 通常不等于 BA。',
  },
  {
    id: 'q2',
    type: 'single',
    stem: '二进制数 1010 对应的十进制数是？',
    options: ['8', '10', '12', '16'],
    answer: '10',
    explanation: '1010(2) = 1×8 + 0×4 + 1×2 + 0×1 = 10。',
  },
  {
    id: 'q3',
    type: 'single',
    stem: 'Choose the correct past tense: He ___ to school yesterday.',
    options: ['go', 'goes', 'went', 'gone'],
    answer: 'went',
    explanation: 'yesterday 表过去，go 的过去式是 went。',
  },
  {
    id: 'q4',
    type: 'multiple',
    stem: '下列哪些函数是偶函数？（多选）',
    options: ['x²', 'cos x', '|x|', 'x³'],
    answer: ['x²', 'cos x', '|x|'],
    explanation: '偶函数满足 f(-x)=f(x)：x²、cos x、|x| 均满足；x³ 是奇函数。',
  },
  {
    id: 'q5',
    type: 'multiple',
    stem: '下列哪些语言支持面向对象编程？（多选）',
    options: ['Java', 'C++', 'Python', 'C'],
    answer: ['Java', 'C++', 'Python'],
    explanation: 'C 是面向过程语言；Java、C++、Python 均支持面向对象。',
  },
  {
    id: 'q6',
    type: 'multiple',
    stem: '关于进程与线程，下列说法正确的有哪些？（多选）',
    options: [
      '进程是资源分配的基本单位',
      '线程是 CPU 调度的基本单位',
      '同一进程内的线程共享内存空间',
      '一个进程只能包含一个线程',
    ],
    answer: ['进程是资源分配的基本单位', '线程是 CPU 调度的基本单位', '同一进程内的线程共享内存空间'],
    explanation: '一个进程可以包含多个线程，故最后一项错误。',
  },
  {
    id: 'q7',
    type: 'judge',
    stem: '若函数在某点可导，则它在该点必定连续。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: '可导必连续，连续不一定可导。',
  },
  {
    id: 'q8',
    type: 'judge',
    stem: 'HTTP 是一种无状态（stateless）协议。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: 'HTTP 本身不保存前后请求的状态，需借助 Cookie/Session 维持状态。',
  },
  {
    id: 'q9',
    type: 'judge',
    stem: '英文单词 "information" 是不可数名词。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: 'information 没有复数形式，是不可数名词。',
  },
  {
    id: 'q10',
    type: 'fill',
    stem: '不定积分 ∫2x dx = ？（请写出含任意常数 C 的结果）',
    answer: ['x^2 + C', 'x² + C'],
    explanation: '∫2x dx = x² + C。',
  },
  {
    id: 'q11',
    type: 'fill',
    stem: 'TCP 建立连接需要三次握手，释放连接需要 ___ 次握手。',
    answer: ['4', '四'],
    explanation: 'TCP 释放连接需要四次握手（FIN/ACK 各两次）。',
  },
  {
    id: 'q12',
    type: 'fill',
    stem: '马克思主义哲学的直接理论来源中，主要是黑格尔的辩证法和 ___ 的唯物主义。',
    answer: ['费尔巴哈'],
    explanation: '马克思批判吸收了费尔巴哈的唯物主义与黑格尔的辩证法。',
  },
  {
    id: 'q13',
    type: 'single',
    stem: '抛一枚均匀硬币两次，至少出现一次正面的概率是？',
    options: ['1/4', '1/2', '3/4', '1'],
    answer: '3/4',
    explanation: '样本空间 4 种，仅"反反"无正面，故概率 = 3/4。',
  },
  {
    id: 'q14',
    type: 'judge',
    stem: '行列式为 0 的方阵一定不可逆。',
    options: ['正确', '错误'],
    answer: '正确',
    explanation: '方阵可逆当且仅当其行列式不为 0。',
  },
  {
    id: 'q15',
    type: 'multiple',
    stem: '下列哪些是英语连词（conjunction）？（多选）',
    options: ['because', 'although', 'quickly', 'if'],
    answer: ['because', 'although', 'if'],
    explanation: 'quickly 是副词；because/although/if 是连词。',
  },
]