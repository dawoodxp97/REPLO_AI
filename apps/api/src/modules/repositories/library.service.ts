import type { RepositoryListInput, RepositoryPage } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { containsPattern } from '../../platform/db/query-helpers'
import { notFound } from '../../platform/errors'
import type { JobHistory } from '../jobs/job-history.service'
import type { CourseManager } from '../courses/manager.service'
import { repositoriesRepo } from './repositories.repo'

interface RepositoryLibraryDeps {
  db: Db
  jobs: Pick<JobHistory, 'latestByRepository'>
  courses: Pick<CourseManager, 'removeForRepository'>
}

export interface RepositoryLibrary {
  list(userId: string, input: RepositoryListInput): Promise<RepositoryPage>
  counts(userId: string): Promise<{ repositories: number; generations: number }>
  remove(userId: string, repositoryId: string): Promise<void>
  findIngestSource(
    userId: string,
    repositoryId: string,
  ): Promise<
    { owner: string; name: string; isPrivate: boolean; installationId: number | null } | undefined
  >
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
  const { db, jobs, courses } = deps

  return {
    async list(userId, input) {
      const repo = repositoriesRepo(db)
      const rows = await repo.listLinked(userId, {
        limit: input.limit + 1,
        cursor: input.cursor,
      })
      const page = rows.slice(0, input.limit)
      const repositoryIds = page.map((row) => row.repositoryId)
      const [latest, stats] = await Promise.all([
        jobs.latestByRepository(userId, repositoryIds),
        repo.statsFor(userId, repositoryIds),
      ])
      const last = page.at(-1)
      return {
        items: page.map((row) => {
          const stat = stats.get(row.repositoryId)
          return {
            repositoryId: row.repositoryId,
            owner: row.owner,
            name: row.name,
            isPrivate: row.isPrivate,
            defaultBranch: row.defaultBranch,
            courseCount: stat?.courseCount ?? 0,
            generationCount: stat?.generationCount ?? 0,
            lastActivityAt: stat?.lastActivityAt?.toISOString() ?? null,
            latestJob: latest.get(row.repositoryId) ?? null,
          }
        }),
        nextCursor: rows.length > input.limit ? (last?.repositoryId ?? null) : null,
      }
    },

    counts: (userId) => repositoriesRepo(db).counts(userId),

    async remove(userId, repositoryId) {
      await db.transaction(async (tx) => {
        if (!(await repositoriesRepo(tx).revokeLink(userId, repositoryId))) notFound('Repository')
        await courses.removeForRepository(tx, userId, repositoryId)
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

    findIngestSource(userId, repositoryId) {
      return repositoriesRepo(db).findIngestSource(userId, repositoryId)
    },
  }
}
