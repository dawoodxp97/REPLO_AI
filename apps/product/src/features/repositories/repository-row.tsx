'use client'

import type { RepositoryListItem } from '@replo/contracts'
import { Badge } from '@replo/ui'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { LinkButton } from '@/components/link-button'
import { JOB_STATUS_LABELS } from '@/features/jobs/job-status'
import { useRemoveRepository } from './use-repositories'

export function RepositoryRow({ repository }: { repository: RepositoryListItem }) {
  const remove = useRemoveRepository()
  const name = `${repository.owner}/${repository.name}`

  return (
    <li className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-border bg-card p-4">
      <div className="min-w-0 space-y-1">
        <p className="flex flex-wrap items-center gap-2 font-mono text-sm break-all">
          {name}
          {repository.isPrivate ? <Badge variant="interpretation">Private</Badge> : null}
        </p>
        <p className="text-xs text-muted-foreground">Default branch {repository.defaultBranch}</p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        {repository.latestJob ? (
          <>
            <Badge>{JOB_STATUS_LABELS[repository.latestJob.status]}</Badge>
            <Link
              href={`/jobs/${repository.latestJob.jobId}`}
              className="text-primary underline underline-offset-4"
            >
              View job
            </Link>
          </>
        ) : (
          <LinkButton href="/import" variant="outline" size="sm">
            Generate tutorial
          </LinkButton>
        )}
        <ConfirmDialog
          triggerLabel="Remove"
          title={`Remove ${name}?`}
          description={`Replo stops reading ${name} and deletes your tutorials and reading progress for it. Public and link URLs for those tutorials stop working.`}
          confirmLabel="Remove repository"
          run={() => remove.mutateAsync({ repositoryId: repository.repositoryId })}
          describeError={() => 'The repository could not be removed. Try again.'}
        />
      </div>
    </li>
  )
}
