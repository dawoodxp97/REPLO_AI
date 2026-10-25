import type { Metadata } from 'next'
import { MyRepositories } from '@/features/repositories/my-repositories'

export const metadata: Metadata = { title: 'Repositories' }

export default function RepositoriesPage() {
  return <MyRepositories />
}
