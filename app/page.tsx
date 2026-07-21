'use client'
import Link from 'next/link'
import { useProgress } from '@/lib/useProgress'

export default function Home() {
  const { progress, total, hydrated, isComplete, reset } = useProgress()
  const answered = Object.keys(progress.answers).length
  const inProgress = hydrated && !isComplete && answered > 0

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-6 py-16">
      <h1 className="mb-2 text-3xl font-bold tracking-tight">大学生刷题</h1>
      <p className="mb-8 text-zinc-500">
        按题库顺序逐题练习，提交看解析，进度自动保存在本地。
      </p>

      {!hydrated ? null : inProgress ? (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-zinc-500">
            已做 {answered} / 共 {total}，继续上次进度。
          </p>
          <Link
            href="/practice"
            className="rounded-xl bg-blue-600 px-5 py-3 text-center font-medium text-white"
          >
            继续刷题
          </Link>
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-zinc-300 px-5 py-3 text-center font-medium dark:border-zinc-700"
          >
            重新开始
          </button>
        </div>
      ) : (
        <Link
          href="/practice"
          className="rounded-xl bg-blue-600 px-5 py-3 text-center font-medium text-white"
        >
          {answered > 0 ? '再刷一次' : '开始刷题'}
        </Link>
      )}

      {total === 0 && (
        <p className="mt-6 text-sm text-amber-600">
          暂无题目，请在 lib/questions.ts 中导入题库。
        </p>
      )}
    </main>
  )
}
