import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { JobPage } from '@/features/jobs/job-page'

export const metadata: Metadata = { title: 'Tutorial generation' }

export default async function JobRoute({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader
        title="Tutorial generation"
        description="Progress is saved on the server, so you can leave this page and come back."
      />
      <JobPage key={jobId} jobId={jobId} />
    </div>
  )
}
