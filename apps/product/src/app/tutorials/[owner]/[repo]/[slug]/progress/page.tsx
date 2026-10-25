import type { Metadata } from 'next'
import { ProgressPage } from '@/features/progress/progress-page'

export const metadata: Metadata = { title: 'Your progress' }

export default async function ProgressRoute({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>
}) {
  const { owner, repo, slug } = await params
  return (
    <main className="mx-auto max-w-4xl space-y-6 px-4 py-10 sm:px-6">
      <ProgressPage tutorial={{ owner, repo, slug }} />
    </main>
  )
}
