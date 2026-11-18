import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { z } from 'zod'
import { LinkButton } from '@/components/link-button'
import { PageHeader } from '@/components/page-header'
import { AdminJobDetailView } from '@/features/admin/admin-job-detail'
import { orNotFound } from '@/features/admin/or-not-found'
import { serverApi } from '@/lib/server-client'

export const metadata: Metadata = { title: 'Admin job' }

export default async function AdminJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const parsed = z.uuid().safeParse((await params).jobId)
  if (!parsed.success) notFound()

  const api = await serverApi()
  const detail = await orNotFound(api.admin.job({ jobId: parsed.data }))

  return (
    <>
      <PageHeader
        title="Job detail"
        action={
          <LinkButton href="/admin/jobs" variant="outline" size="sm">
            All jobs
          </LinkButton>
        }
      />
      <AdminJobDetailView detail={detail} />
    </>
  )
}