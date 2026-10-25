import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { PageHeader } from '@/components/page-header'
import { OperatorJobDetailView } from '@/features/operator/operator-views'
import { serverApi } from '@/lib/server-client'

export const metadata: Metadata = { title: 'Operator job' }

export default async function OperatorJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params
  const api = await serverApi()
  const detail = await api.operator.job({ jobId }).catch(() => null)
  if (!detail) notFound()

  return (
    <div className="space-y-6">
      <PageHeader title="Job detail" />
      <OperatorJobDetailView detail={detail} />
    </div>
  )
}
