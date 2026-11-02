import type { Metadata } from 'next'
import { PageHeader } from '@/components/page-header'
import { GithubSetupNotice } from '@/features/import/github-setup-notice'
import { ImportForm } from '@/features/import/import-form'
import { sourceFromRepoParam } from '@/lib/import-path'

export const metadata: Metadata = { title: 'Import a repository' }

interface ImportPageProps {
  searchParams: Promise<{ github?: string | string[]; repo?: string | string[] }>
}

export default async function ImportPage({ searchParams }: ImportPageProps) {
  const { github, repo } = await searchParams
  const status = Array.isArray(github) ? github[0] : github
  const repoParam = Array.isArray(repo) ? repo[0] : repo

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader
        title="Import a repository"
        description="Check the repository, pick a key and preset, review the estimate, then generate."
      />
      <GithubSetupNotice status={status} />
      <ImportForm initialSource={sourceFromRepoParam(repoParam)} />
    </div>
  )
}
