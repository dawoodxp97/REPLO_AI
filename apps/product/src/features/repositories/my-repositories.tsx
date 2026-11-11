'use client'

import { PageHeader } from '@/components/page-header'
import { RepositoryList } from './repository-list'
import { NewTutorialAction } from '@/components/new-tutorial-action'

export function MyRepositories() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Repositories"
        description="Repositories you have imported, with the state of their latest tutorial job."
        action={<NewTutorialAction />}
      />
      <RepositoryList />
    </div>
  )
}
