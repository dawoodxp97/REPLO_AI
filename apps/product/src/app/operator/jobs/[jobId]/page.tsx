import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { OperatorJobDetailView } from '@/features/operator/operator-job-detail'
import { orNotFound } from '@/features/operator/or-not-found'
import { serverApi } from '@/lib/server-client'

export const metadata: Metadata = { title: 'Operator job' }

export default async function OperatorJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const parsed = z.uuid().safeParse((await params).jobId)
  if (!parsed.success) notFound()

  const api = await serverApi()
  const detail = await orNotFound(api.operator.job({ jobId: parsed.data }))

  return (
    <>
      <PageHeader
        title="Job detail"
        action={
          <LinkButton href="/operator" variant="outline" size="sm">
            All jobs
          </LinkButton>
        }
      />
      <OperatorJobDetailView detail={detail} />
    </>
  )
}
