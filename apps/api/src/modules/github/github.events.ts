import { CommitSha } from '@replo/contracts'
import { z } from 'zod'
import { GithubRepository, UserInstallation } from '../../platform/github/schemas'
import type { InstallationChange, RepositoryMetadata } from './github.ports'

const HANDLED_EVENTS = ['installation', 'installation_repositories', 'repository', 'push'] as const
export type HandledEvent = (typeof HANDLED_EVENTS)[number]

const HANDLED_EVENT_SET = new Set<string>(HANDLED_EVENTS)

export const isHandledEvent = (event: string): event is HandledEvent => HANDLED_EVENT_SET.has(event)

export const EVENT_SCHEMAS = {
  installation: z.object({ action: z.string(), installation: UserInstallation }),
  installation_repositories: z.object({
    action: z.enum(['added', 'removed']),
    installation: z.object({ id: z.number().int().positive() }),
    repositories_removed: z.array(z.object({ id: z.number().int().positive() })).default([]),
  }),
  repository: z.object({ action: z.string(), repository: GithubRepository }),
  push: z.object({
    ref: z.string(),
    after: CommitSha,
    repository: z.object({ id: z.number().int().positive() }),
    commits: z.array(
      z.object({
        added: z.array(z.string()),
        removed: z.array(z.string()),
        modified: z.array(z.string()),
      }),
    ),
  }),
} as const

const MAX_PUSH_PATHS = 5000

export const changedPaths = (commits: z.output<typeof EVENT_SCHEMAS.push>['commits']): string[] => {
  const paths = new Set<string>()
  for (const commit of commits)
    for (const path of [...commit.added, ...commit.removed, ...commit.modified]) paths.add(path)
  return [...paths].slice(0, MAX_PUSH_PATHS)
}

type PushChange = Extract<InstallationChange, { kind: 'push' }>

export const pushChange = (push: z.output<typeof EVENT_SCHEMAS.push>): PushChange => ({
  kind: 'push',
  githubRepoId: push.repository.id,
  ref: push.ref,
  commitSha: push.after,
  paths: changedPaths(push.commits),
})

export const suspendedAt = (installation: { suspended_at?: string | null }): Date | null =>
  installation.suspended_at ? new Date(installation.suspended_at) : null

export function toRepositoryMetadata(
  repository: z.output<typeof GithubRepository>,
): RepositoryMetadata {
  return {
    githubRepoId: repository.id,
    owner: repository.owner.login,
    name: repository.name,
    isPrivate: repository.private,
    defaultBranch: repository.default_branch,
    license: repository.license?.spdx_id ?? null,
  }
}

type RepositoryEventChange = Extract<
  InstallationChange,
  { kind: 'repository_deleted' | 'repository_updated' }
>

export const repositoryChange = (
  action: string,
  repository: z.output<typeof GithubRepository>,
): RepositoryEventChange =>
  action === 'deleted'
    ? { kind: 'repository_deleted', githubRepoId: repository.id }
    : { kind: 'repository_updated', repository: toRepositoryMetadata(repository) }
