import type { Metadata } from 'next'
import { SourceExplorer } from '@/features/player/source/source-explorer'
import { TutorialShell } from '@/features/tutorials/tutorial-shell'

export const metadata: Metadata = { title: 'Source' }

export default async function SourceExplorerRoute({
  params,
}: {
  params: Promise<{ owner: string; repo: string; slug: string }>
}) {
  const { owner, repo, slug } = await params
  return (
    <TutorialShell wide>
      <SourceExplorer tutorial={{ owner, repo, slug }} />
    </TutorialShell>
  )
}
