'use client'

import { Item, ItemActions, ItemContent, ItemGroup, ItemTitle, Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { GitBranch } from 'lucide-react'
import { InlineError } from '@/components/inline-error'
import { LinkButton } from '@/components/link-button'
import { QueryBoundary } from '@/components/query-boundary'
import { RepoVisibilityBadge } from '@/components/repo-visibility-badge'
import { SectionHeader } from '@/components/page-header'
import { formatRepoName } from '@/lib/format'
import { orpc } from '@/lib/orpc'

function RepoList() {
  const repos = useQuery(orpc.github.listRepos.queryOptions())

  return (
    <QueryBoundary
      query={repos}
      errorTitle="Your GitHub App repositories could not be loaded"
      loading={<Skeleton aria-busy="true" className="h-24 w-full" />}
    >
      {(items) =>
        items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The app has no repositories for your account yet.
          </p>
        ) : (
          <ItemGroup>
            {items.map((repo) => (
              <Item key={repo.githubRepoId} size="sm">
                <ItemContent>
                  <ItemTitle className="font-mono text-compact">
                    {formatRepoName(repo.owner, repo.name)}
                  </ItemTitle>
                </ItemContent>
                <ItemActions className="text-xs text-muted-foreground">
                  <RepoVisibilityBadge isPrivate={repo.isPrivate} />
                  <span className="inline-flex items-center gap-1 font-mono">
                    <GitBranch className="size-3.5" aria-hidden />
                    {repo.defaultBranch}
                  </span>
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
        )
      }
    </QueryBoundary>
  )
}

function InstallAccess() {
  const install = useQuery(orpc.github.installUrl.queryOptions())

  if (install.isPending) return <Skeleton aria-busy="true" className="h-9 w-48" />
  if (install.isError) {
    return <InlineError>The GitHub App install link could not be loaded.</InlineError>
  }
  if (!install.data.url) {
    return (
      <p className="text-sm text-muted-foreground">
        The GitHub App is not configured on this server yet.
      </p>
    )
  }
  return (
    <div>
      <LinkButton href={install.data.url} variant="outline">
        Change repository access
      </LinkButton>
    </div>
  )
}

export function GithubSection() {
  return (
    <div className="space-y-4">
      <SectionHeader
        title="GitHub App"
        description="Replo reads the repositories you choose, read-only. Public repositories need no install."
      />
      <RepoList />
      <InstallAccess />
    </div>
  )
}
