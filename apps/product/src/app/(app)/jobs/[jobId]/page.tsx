import type { Metadata } from 'next'
import { JobPage } from '@/features/jobs/job-page'

export const metadata: Metadata = { title: 'Tutorial generation' }

export default async function JobRoute({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <JobPage key={jobId} jobId={jobId} />
    </div>
  )
}
