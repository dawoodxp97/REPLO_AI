'use client'

import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { LinkButton } from '@/components/link-button'
import { orpc } from '@/lib/orpc'

export function GithubSection() {
  const repos = useQuery(orpc.github.listRepos.queryOptions())
  const install = useQuery(orpc.github.installUrl.queryOptions())

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">GitHub App</CardTitle>
        <CardDescription>
          Replo reads the repositories you choose, read-only. Public repositories need no install.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {repos.isPending ? (
          <Skeleton aria-busy="true" className="h-24 w-full" />
        ) : repos.isError ? (
          <Alert tone="destructive" role="alert">
            Your GitHub App repositories could not be loaded.
          </Alert>
        ) : repos.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            The app has no repositories for your account yet.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-md border border-border">
            {repos.data.map((repo) => (
              <li
                key={repo.githubRepoId}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="font-mono">
                  {repo.owner}/{repo.name}
                </span>
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  {repo.isPrivate ? <Badge variant="interpretation">Private</Badge> : null}
                  {repo.defaultBranch}
                </span>
              </li>
            ))}
          </ul>
        )}
        {install.data?.url ? (
          <LinkButton href={install.data.url} variant="outline">
            Change repository access
          </LinkButton>
        ) : (
          <p className="text-sm text-muted-foreground">
            The GitHub App is not configured on this server yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
