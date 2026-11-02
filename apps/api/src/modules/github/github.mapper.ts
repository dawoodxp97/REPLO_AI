import type { z } from 'zod'
import type { GithubRepository } from '../../platform/github/schemas'
import type { RepositoryMetadata } from './github.ports'

type Repository = z.output<typeof GithubRepository>

export const toRepositorySummary = (repository: Repository) => ({
  githubRepoId: repository.id,
  owner: repository.owner.login,
  name: repository.name,
  isPrivate: repository.private,
  defaultBranch: repository.default_branch,
})

export const toRepositoryMetadata = (repository: Repository): RepositoryMetadata => ({
  ...toRepositorySummary(repository),
  license: repository.license?.spdx_id ?? null,
})
