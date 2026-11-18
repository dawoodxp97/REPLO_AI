import { and, count, desc, eq, ilike, inArray, isNull, lt, max, type SQL, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import {
  courses,
  generationJobs,
  repositories,
  repositorySnapshots,
  userRepositories,
} from '../../platform/db/schema'
import type { RepositoryMetadata } from '../github/github.ports'

const metadataColumns = (repository: RepositoryMetadata) => ({
  owner: repository.owner,
  name: repository.name,
  isPrivate: repository.isPrivate,
  defaultBranch: repository.defaultBranch,
  license: repository.license,
})

const linkedRepositoryColumns = {
  repositoryId: repositories.id,
  owner: repositories.owner,
  name: repositories.name,
  isPrivate: repositories.isPrivate,
  defaultBranch: repositories.defaultBranch,
  installationId: userRepositories.githubInstallationId,
}

const activeLinkOf = (userId: string) =>
  and(eq(userRepositories.userId, userId), isNull(userRepositories.revokedAt))

const qualifiedName = sql`${repositories.owner} || '/' || ${repositories.name}`

const repositoryIdsByGithubIds = (db: DbOrTx, githubRepoIds: number[]) =>
  db
    .select({ id: repositories.id })
    .from(repositories)
    .where(inArray(repositories.githubRepoId, githubRepoIds))

function toDate(value: Date | string | null): Date | null {
  return value === null ? null : new Date(value)
}

function newest(current: Date | null, candidate: Date | null): Date | null {
  if (candidate === null) return current
  if (current === null) return candidate
  return candidate > current ? candidate : current
}

export interface RepositoryStats {
  repositoryId: string
  courseCount: number
  generationCount: number
  lastActivityAt: Date | null
}

export const repositoriesRepo = (db: DbOrTx) => {
  const linkedRepositories = (userId: string, ...predicates: (SQL | undefined)[]) =>
    db
      .select(linkedRepositoryColumns)
      .from(userRepositories)
      .innerJoin(repositories, eq(repositories.id, userRepositories.repositoryId))
      .where(and(activeLinkOf(userId), ...predicates))

  const revokeWhere = (predicate: SQL | undefined) =>
    db
      .update(userRepositories)
      .set({ revokedAt: sql`now()` })
      .where(predicate)

  return {
    async upsertRepository(repository: RepositoryMetadata): Promise<string> {
      const [row] = await db
        .insert(repositories)
        .values({ githubRepoId: repository.githubRepoId, ...metadataColumns(repository) })
        .onConflictDoUpdate({
          target: repositories.githubRepoId,
          set: metadataColumns(repository),
        })
        .returning({ id: repositories.id })
      if (!row) throw new Error('repository row missing after upsert')
      return row.id
    },

    async linkUser(userId: string, repositoryId: string, installationId: number | null) {
      await db
        .insert(userRepositories)
        .values({ userId, repositoryId, githubInstallationId: installationId })
        .onConflictDoUpdate({
          target: [userRepositories.userId, userRepositories.repositoryId],
          set: { githubInstallationId: installationId, revokedAt: null },
        })
    },

    async findIngestSource(userId: string, repositoryId: string) {
      const [row] = await linkedRepositories(
        userId,
        eq(userRepositories.repositoryId, repositoryId),
      ).limit(1)
      if (!row) return undefined
      return {
        owner: row.owner,
        name: row.name,
        isPrivate: row.isPrivate,
        installationId: row.installationId,
      }
    },

    async findByGithubRepoId(githubRepoId: number) {
      const [row] = await db
        .select({ id: repositories.id, defaultBranch: repositories.defaultBranch })
        .from(repositories)
        .where(eq(repositories.githubRepoId, githubRepoId))
        .limit(1)
      return row
    },

    async revokeLink(userId: string, repositoryId: string): Promise<boolean> {
      const revoked = await revokeWhere(
        and(activeLinkOf(userId), eq(userRepositories.repositoryId, repositoryId)),
      ).returning({ repositoryId: userRepositories.repositoryId })
      return revoked.length > 0
    },

    async linkedIds(userId: string): Promise<string[]> {
      const rows = await db
        .select({ repositoryId: userRepositories.repositoryId })
        .from(userRepositories)
        .where(activeLinkOf(userId))
      return rows.map((row) => row.repositoryId)
    },

    describeLinked(userId: string, repositoryIds: string[]) {
      if (repositoryIds.length === 0) return Promise.resolve([])
      return linkedRepositories(userId, inArray(repositories.id, repositoryIds))
    },

    searchLinked(userId: string, pattern: string, limit: number) {
      return linkedRepositories(userId, ilike(qualifiedName, pattern))
        .orderBy(repositories.owner, repositories.name)
        .limit(limit)
    },

    listLinked(userId: string, page: { limit: number; cursor?: string }) {
      return linkedRepositories(userId, page.cursor ? lt(repositories.id, page.cursor) : undefined)
        .orderBy(desc(repositories.id))
        .limit(page.limit)
    },

    async counts(userId: string): Promise<{ repositories: number; generations: number }> {
      const [linked] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(userRepositories)
        .where(activeLinkOf(userId))
      const [generations] = await db
        .select({ value: sql<number>`count(*)::int` })
        .from(generationJobs)
        .innerJoin(repositorySnapshots, eq(repositorySnapshots.id, generationJobs.snapshotId))
        .innerJoin(
          userRepositories,
          and(
            eq(userRepositories.repositoryId, repositorySnapshots.repositoryId),
            activeLinkOf(userId),
          ),
        )
        .where(eq(generationJobs.userId, userId))
      return { repositories: linked?.value ?? 0, generations: generations?.value ?? 0 }
    },

    async statsFor(
      userId: string,
      repositoryIds: readonly string[],
    ): Promise<Map<string, RepositoryStats>> {
      if (repositoryIds.length === 0) return new Map()
      const ids = [...repositoryIds]
      const [courseRows, jobRows] = await Promise.all([
        db
          .select({
            repositoryId: courses.repositoryId,
            courseCount: count(),
            lastCourseAt: max(courses.updatedAt),
          })
          .from(courses)
          .where(and(eq(courses.userId, userId), inArray(courses.repositoryId, ids)))
          .groupBy(courses.repositoryId),
        db
          .select({
            repositoryId: repositorySnapshots.repositoryId,
            generationCount: count(),
            lastJobAt: max(
              sql`coalesce(${generationJobs.finishedAt}, ${generationJobs.createdAt})`,
            ),
          })
          .from(generationJobs)
          .innerJoin(repositorySnapshots, eq(repositorySnapshots.id, generationJobs.snapshotId))
          .where(
            and(eq(generationJobs.userId, userId), inArray(repositorySnapshots.repositoryId, ids)),
          )
          .groupBy(repositorySnapshots.repositoryId),
      ])
      const stats = new Map<string, RepositoryStats>()
      for (const id of ids) {
        stats.set(id, {
          repositoryId: id,
          courseCount: 0,
          generationCount: 0,
          lastActivityAt: null,
        })
      }
      for (const row of courseRows) {
        const current = stats.get(row.repositoryId)
        if (current) {
          current.courseCount = row.courseCount
          current.lastActivityAt = newest(current.lastActivityAt, toDate(row.lastCourseAt))
        }
      }
      for (const row of jobRows) {
        const current = stats.get(row.repositoryId)
        if (current) {
          current.generationCount = row.generationCount
          current.lastActivityAt = newest(current.lastActivityAt, toDate(row.lastJobAt))
        }
      }
      return stats
    },

    async revokeInstallation(installationId: number) {
      await revokeWhere(
        and(
          eq(userRepositories.githubInstallationId, installationId),
          isNull(userRepositories.revokedAt),
        ),
      )
    },

    async revokeInstallationRepositories(installationId: number, githubRepoIds: number[]) {
      await revokeWhere(
        and(
          eq(userRepositories.githubInstallationId, installationId),
          isNull(userRepositories.revokedAt),
          inArray(userRepositories.repositoryId, repositoryIdsByGithubIds(db, githubRepoIds)),
        ),
      )
    },

    async revokeRepository(githubRepoId: number) {
      await revokeWhere(
        and(
          isNull(userRepositories.revokedAt),
          inArray(userRepositories.repositoryId, repositoryIdsByGithubIds(db, [githubRepoId])),
        ),
      )
    },

    async updateMetadata(repository: RepositoryMetadata) {
      await db
        .update(repositories)
        .set(metadataColumns(repository))
        .where(eq(repositories.githubRepoId, repository.githubRepoId))
    },
  }
}
