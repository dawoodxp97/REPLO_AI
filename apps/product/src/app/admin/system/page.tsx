import type { Metadata } from 'next'
import { AdminSystem } from '@/features/admin/admin-system'

export const metadata: Metadata = { title: 'Admin system' }

export default function AdminSystemPage() {
  return <AdminSystem />
}