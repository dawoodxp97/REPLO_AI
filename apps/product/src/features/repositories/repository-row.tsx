'use client'

import type { RepositoryListItem } from '@replo/contracts'
import { Item, ItemActions, ItemContent, ItemDescription, ItemTitle } from '@replo/ui'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LinkButton } from '@/components/link-button'
import { PrivateRepoBadge } from '@/components/private-repo-badge'
import { JobStatusLink } from '@/features/jobs/job-status-badge'
import { formatCount, formatDateTime, formatRepoName } from '@/lib/format'
import { importPath, NEW_COURSE_LABEL } from '@/lib/import-path'
import { useRemoveRepository } from './use-repositories'

export function RepositoryRow({ repository }: { repository: RepositoryListItem }) {
  const remove = useRemoveRepository()
  const name = formatRepoName(repository.owner, repository.name)

  return (
    <Item>
      <ItemContent>
        <ItemTitle>
          <span className="font-mono break-all">{name}</span>
          <PrivateRepoBadge isPrivate={repository.isPrivate} />
        </ItemTitle>
        <ItemDescription className="text-xs">
          Default branch <span className="font-mono">{repository.defaultBranch}</span> ·{' '}
          <span className="tabular font-mono">{formatCount(repository.courseCount)}</span> courses ·{' '}
          <span className="tabular font-mono">{formatCount(repository.generationCount)}</span>{' '}
          generations
          <span className="block">
            {repository.lastActivityAt
              ? `Last activity ${formatDateTime(repository.lastActivityAt)}`
              : 'No activity yet'}
          </span>
        </ItemDescription>
      </ItemContent>
      <ItemActions>
        {repository.latestJob ? (
          <JobStatusLink jobId={repository.latestJob.jobId} status={repository.latestJob.status} />
        ) : (
          <LinkButton href={importPath(repository)} variant="outline" size="sm">
            {NEW_COURSE_LABEL}
          </LinkButton>
        )}
        <ConfirmDialog
          triggerLabel="Remove"
          title={`Remove ${name}?`}
          description={`Replo stops reading ${name} and deletes your courses and reading progress for it. Public and link URLs for those courses stop working.`}
          confirmLabel="Remove repository"
          run={() => remove.mutateAsync({ repositoryId: repository.repositoryId })}
          describeError={() => 'The repository could not be removed. Try again.'}
        />
      </ItemActions>
    </Item>
  )
}
