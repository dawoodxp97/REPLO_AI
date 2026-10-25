import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { JobPage } from '@/features/jobs/job-page'

export const metadata: Metadata = { title: 'Generating tutorial' }

export default async function JobRoute({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Generating your tutorial"
        description="Usually about ten minutes. You can leave this page; progress is saved."
      />
      <JobPage jobId={jobId} />
    </div>
  )
}
