import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { OperatorJobsTable } from '@/features/operator/operator-views'
import { serverApi } from '@/lib/server-client'

export const metadata: Metadata = { title: 'Operator' }

export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>
}) {
  const { cursor } = await searchParams
  const api = await serverApi()
  const page = await api.operator.jobs({ limit: 50, cursor }).catch(() => null)
  if (!page) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Jobs" description="Every generation job, its stage and its model calls." />
      <OperatorJobsTable rows={page.items} nextCursor={page.nextCursor} />
    </div>
  )
}
