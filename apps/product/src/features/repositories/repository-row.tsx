'use client'

import type { RepositoryListItem } from '@replo/contracts'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@replo/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LinkButton } from '@/components/link-button'
import { RepoVisibilityBadge } from '@/components/repo-visibility-badge'
import { JobStatusLink } from '@/features/jobs/job-status-link'
import { formatRepoName } from '@/lib/format'
import { importPath, NEW_TUTORIAL_LABEL } from '@/lib/import-path'
import { useRemoveRepository } from './use-repositories'

export function RepositoryRow({ repository }: { repository: RepositoryListItem }) {
  const remove = useRemoveRepository()
  const name = formatRepoName(repository.owner, repository.name)

  return (
    <Item>
      <ItemContent>
        <ItemTitle>
          <span className="font-mono break-all">{name}</span>
          <RepoVisibilityBadge isPrivate={repository.isPrivate} />
        </ItemTitle>
        <ItemDescription className="text-xs">
          Default branch <span className="font-mono">{repository.defaultBranch}</span>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {repository.latestJob ? (
          <JobStatusLink jobId={repository.latestJob.jobId} status={repository.latestJob.status} />
        ) : (
          <LinkButton href={importPath(repository)} variant="outline" size="sm">
            {NEW_TUTORIAL_LABEL}
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
