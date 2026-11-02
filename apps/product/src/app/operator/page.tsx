import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { orNotFound } from '@/features/operator/or-not-found'
import { OperatorJobsTable } from '@/features/operator/operator-jobs-table'
import { serverApi } from '@/lib/server-client'

export const metadata: Metadata = { title: 'Operator' }

export default async function OperatorPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string }>
}) {
  const { cursor } = await searchParams
  const api = await serverApi()
  const page = await orNotFound(api.operator.jobs({ limit: 50, cursor }))

  return (
    <>
      <PageHeader title="Jobs" description="Every generation job, its stage and its model calls." />
      <OperatorJobsTable rows={page.items} nextCursor={page.nextCursor} />
    </>
  )
}
