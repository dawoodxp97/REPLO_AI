import type { Db } from '../../platform/db/client'
import { repositoriesRepo } from './repositories.repo'

export interface RepositorySources {
  ingestSource(
    userId: string,
    repositoryId: string,
  ): Promise<
    { owner: string; name: string; isPrivate: boolean; installationId: number | null } | undefined
  >
}

export function createRepositorySources(db: Db): RepositorySources {
  return {
    ingestSource: (userId, repositoryId) =>
      repositoriesRepo(db).findIngestSource(userId, repositoryId),
  }
}
