'use client'

import { PageHeader } from '@/components/page-header'
import { LinkButton } from '@/components/link-button'
import { importPath, NEW_TUTORIAL_LABEL } from '@/lib/import-path'
import { RepositoryList } from './repository-list'

export function MyRepositories() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Repositories"
        description="Repositories you have imported, with the state of their latest tutorial job."
        action={<LinkButton href={importPath()}>{NEW_TUTORIAL_LABEL}</LinkButton>}
      />
      <RepositoryList />
    </div>
  )
}
