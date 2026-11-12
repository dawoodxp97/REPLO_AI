'use client'

import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@replo/ui'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { LinkButton } from '@/components/link-button'
import { JobStatusBadge } from '@/features/jobs/job-status-badge'
import { useRepositoryList } from '@/features/repositories/use-repositories'
import { formatRepoName } from '@/lib/format'
import { importPath } from '@/lib/import-path'
import { pageItems } from '@/lib/paging'

const SHORTLIST_SIZE = 4

export function RepositoryShortlist() {
  const repositories = pageItems(useRepositoryList().data).slice(0, SHORTLIST_SIZE)
  if (repositories.length === 0) return null

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Repositories</CardTitle>
        <CardAction>
          <LinkButton href="/repositories" variant="ghost" size="xs">
            View all
          </LinkButton>
        </CardAction>
      </CardHeader>
      <CardContent>
        <ul className="divide-y">
          {repositories.map((repository) => {
            const name = formatRepoName(repository.owner, repository.name)
            return (
              <li
                key={repository.repositoryId}
                className="flex items-center gap-2 py-2 first:pt-0 last:pb-0"
              >
                <span className="min-w-0 flex-1 truncate font-mono text-compact">{name}</span>
                {repository.latestJob ? (
                  <Link
                    href={`/jobs/${repository.latestJob.jobId}`}
                    aria-label={`Latest job for ${name}`}
                    className="inline-flex items-center rounded-md pointer-coarse:min-h-10"
                  >
                    <JobStatusBadge status={repository.latestJob.status} />
                  </Link>
                ) : null}
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <LinkButton
                        href={importPath(repository)}
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`New tutorial for ${name}`}
                      />
                    }
                  >
                    <Plus />
                  </TooltipTrigger>
                  <TooltipContent>New tutorial</TooltipContent>
                </Tooltip>
              </li>
            )
          })}
        </ul>
      </CardContent>
    </Card>
  )
}
