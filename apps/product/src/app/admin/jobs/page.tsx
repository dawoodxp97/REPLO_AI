import type { Metadata } from 'next'
import { AdminJobs } from '@/features/admin/admin-jobs'

export const metadata: Metadata = { title: 'Admin jobs' }

export default function AdminJobsPage() {
  return <AdminJobs />
}