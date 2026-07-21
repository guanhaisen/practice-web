'use client'
import Link from 'next/link'
import { useProgress } from '@/lib/useProgress'
import { questions } from '@/lib/questions'
import QuestionCard from '@/components/QuestionCard'
import Summary from '@/components/Summary'

export default function PracticePage() {
  const { progress, total, isComplete, submitAnswer, next, reset } = useProgress()
  const i = progress.currentIndex

  if (isComplete) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
        <Summary progress={progress} onRestart={reset} />
        <Link href="/" className="mt-4 block text-center text-sm text-blue-600">
          返回首页
        </Link>
      </main>
    )
  }

  const question = questions[i]
  if (!question) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16 text-center text-zinc-500">
        题库为空或进度异常，
        <Link href="/" className="text-blue-600">
          返回首页
        </Link>
      </main>
    )
  }

  const saved = progress.answers[question.id]?.value

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-16">
      <Link href="/" className="mb-4 inline-block text-sm text-blue-600">
        ← 退出（进度已保存）
      </Link>
      <QuestionCard
        key={question.id}
        question={question}
        index={i}
        total={total}
        initialValue={saved}
        onSubmit={(value) => submitAnswer(i, value)}
        onNext={next}
      />
    </main>
  )
}
