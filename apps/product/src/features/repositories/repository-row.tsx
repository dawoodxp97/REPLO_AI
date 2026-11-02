'use client'

import type { RepositoryListItem } from '@replo/contracts'
import { Badge, Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@replo/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LinkButton } from '@/components/link-button'
import { JobStatusLink } from '@/features/jobs/job-status-link'
import { useRemoveRepository } from './use-repositories'

export function RepositoryRow({ repository }: { repository: RepositoryListItem }) {
  const remove = useRemoveRepository()
  const name = `${repository.owner}/${repository.name}`

  return (
    <Item>
      <ItemContent>
        <ItemTitle>
          <span className="font-mono break-all">{name}</span>
          {repository.isPrivate ? <Badge variant="outline">Private</Badge> : null}
        </ItemTitle>
        <ItemDescription className="text-xs">
          Default branch <span className="font-mono">{repository.defaultBranch}</span>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {repository.latestJob ? (
          <JobStatusLink jobId={repository.latestJob.jobId} status={repository.latestJob.status} />
        ) : (
          <LinkButton href="/import" variant="outline" size="sm">
            Generate tutorial
          </LinkButton>
        )}
        <ConfirmDialog
          triggerLabel="Remove"
          triggerVariant="ghost"
          title={`Remove ${name}?`}
          description={`Replo stops reading ${name} and deletes your tutorials and reading progress for it. Public and link URLs for those tutorials stop working.`}
          confirmLabel="Remove repository"
          run={() => remove.mutateAsync({ repositoryId: repository.repositoryId })}
          describeError={() => 'The repository could not be removed. Try again.'}
        />
      </ItemActions>
    </Item>
  )
}
