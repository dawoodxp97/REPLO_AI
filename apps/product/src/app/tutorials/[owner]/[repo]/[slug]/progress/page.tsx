import type { Metadata } from 'next'
import { ProgressPage } from '@/features/progress/progress-page'
import { TutorialShell } from '@/features/tutorials/tutorial-shell'
import type { TutorialRef } from '@/lib/tutorial-paths'

export const metadata: Metadata = { title: 'Your progress' }

export default async function ProgressRoute({ params }: { params: Promise<TutorialRef> }) {
  return (
    <TutorialShell>
      <ProgressPage tutorial={await params} />
    </TutorialShell>
  )
}
