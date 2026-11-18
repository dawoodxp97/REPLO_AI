import type { ReactNode } from 'react'
import { AdminShell } from '@/components/app-shell/admin-shell'
import { orNotFound } from '@/features/admin/or-not-found'
import { serverApi } from '@/lib/server-client'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const api = await serverApi()
  await orNotFound(api.admin.overview())

  return <AdminShell>{children}</AdminShell>
}