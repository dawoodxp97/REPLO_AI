import type { Metadata } from 'next'
import { RepositoriesPage } from '@/features/repositories/repositories-page'

export const metadata: Metadata = { title: 'Repositories' }

export default function RepositoriesRoute() {
  return <RepositoriesPage />
}
