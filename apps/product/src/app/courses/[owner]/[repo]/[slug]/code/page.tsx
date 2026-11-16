import type { Metadata } from 'next'
import { SourceExplorer } from '@/features/player/source/source-explorer'
import { CourseShell } from '@/features/courses/course-shell'

export const metadata: Metadata = { title: 'Source' }

export default async function SourceExplorerRoute({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>
}) {
  const { owner, repo, slug } = await params
  return (
    <CourseShell wide>
      <SourceExplorer course={{ owner, repo, slug }} />
    </CourseShell>
  )
}
