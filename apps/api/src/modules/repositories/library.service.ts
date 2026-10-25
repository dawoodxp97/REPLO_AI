import type { RepositoryListInput, RepositoryPage } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { containsPattern } from '../../platform/db/like'
import { notFound } from '../../platform/errors'
import type { JobHistory } from '../generation/job-history.service'
import type { TutorialManager } from '../tutorials/manager.service'
import { repositoriesRepo } from './repositories.repo'

interface RepositoryLibraryDeps {
  db: Db
  jobs: Pick<JobHistory, 'latestByRepository'>
  tutorials: Pick<TutorialManager, 'removeForRepository'>
}

export interface RepositoryLibrary {
  list(userId: string, input: RepositoryListInput): Promise<RepositoryPage>
  remove(userId: string, repositoryId: string): Promise<void>
  searchOwn(
    userId: string,
    query: string,
    limit: number,
  ): Promise<{ repositoryId: string; owner: string; name: string }[]>
  describeLinked(
    userId: string,
    repositoryIds: readonly string[],
  ): Promise<Map<string, { owner: string; name: string }>>
  linkedIds(userId: string): Promise<string[]>
}

export function createRepositoryLibrary(deps: RepositoryLibraryDeps): RepositoryLibrary {
  const { db, jobs, tutorials } = deps

  return {
    async list(userId, input) {
      const rows = await repositoriesRepo(db).listLinked(userId, {
        limit: input.limit + 1,
        cursor: input.cursor,
      })
      const page = rows.slice(0, input.limit)
      const latest = await jobs.latestByRepository(
        userId,
        page.map((row) => row.repositoryId),
      )
      const last = page.at(-1)
      return {
        items: page.map((row) => ({
          repositoryId: row.repositoryId,
          owner: row.owner,
          name: row.name,
          isPrivate: row.isPrivate,
          defaultBranch: row.defaultBranch,
          latestJob: latest.get(row.repositoryId) ?? null,
        })),
        nextCursor: rows.length > input.limit ? (last?.repositoryId ?? null) : null,
      }
    },

    async remove(userId, repositoryId) {
      const link = await repositoriesRepo(db).findLinked(userId, repositoryId)
      if (!link) notFound('Repository')
      await db.transaction(async (tx) => {
        await repositoriesRepo(tx).revokeLink(userId, repositoryId)
        await tutorials.removeForRepository(tx, userId, repositoryId)
      })
    },

    linkedIds: (userId) => repositoriesRepo(db).linkedIds(userId),

    async describeLinked(userId, repositoryIds) {
      const rows = await repositoriesRepo(db).describeLinked(userId, [...repositoryIds])
      return new Map(rows.map((row) => [row.repositoryId, { owner: row.owner, name: row.name }]))
    },

    searchOwn: (userId, query, limit) =>
      repositoriesRepo(db)
        .searchLinked(userId, containsPattern(query), limit)
        .then((rows) =>
          rows.map((row) => ({ repositoryId: row.repositoryId, owner: row.owner, name: row.name })),
        ),
  }
}
