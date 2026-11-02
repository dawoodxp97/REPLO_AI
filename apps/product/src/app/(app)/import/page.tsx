import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { GithubSetupNotice } from '@/features/import/github-setup-notice'
import { ImportForm } from '@/features/import/import-form'

export const metadata: Metadata = { title: 'Import a repository' }

interface ImportPageProps {
  searchParams: Promise<{ github?: string | string[] }>
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const { github } = await searchParams
  const status = Array.isArray(github) ? github[0] : github

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Import a repository"
        description="Check the repository, pick a key and preset, review the estimate, then generate."
      />
      <GithubSetupNotice status={status} />
      <ImportForm />
    </div>
  )
}
