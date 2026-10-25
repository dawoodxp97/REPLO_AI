import { and, desc, eq, ilike, inArray, isNull, lt, type SQL, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { repositories, userRepositories } from '../../platform/db/schema'
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
}

const activeLinkOf = (userId: string) =>
  and(eq(userRepositories.userId, userId), isNull(userRepositories.revokedAt))

export const repositoriesRepo = (db: DbOrTx) => {
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
        .values({ userId, repositoryId, installationId })
        .onConflictDoUpdate({
          target: [userRepositories.userId, userRepositories.repositoryId],
          set: { installationId, revokedAt: null },
        })
    },

    async findIngestSource(userId: string, repositoryId: string) {
      const [row] = await db
        .select({
          owner: repositories.owner,
          name: repositories.name,
          isPrivate: repositories.isPrivate,
          installationId: userRepositories.installationId,
        })
        .from(userRepositories)
        .innerJoin(repositories, eq(repositories.id, userRepositories.repositoryId))
        .where(and(activeLinkOf(userId), eq(userRepositories.repositoryId, repositoryId)))
        .limit(1)
      return row
    },

    async findByGithubRepoId(githubRepoId: number) {
      const [row] = await db
        .select({ id: repositories.id, defaultBranch: repositories.defaultBranch })
        .from(repositories)
        .where(eq(repositories.githubRepoId, githubRepoId))
        .limit(1)
      return row
    },

    async findLinked(userId: string, repositoryId: string) {
      const [row] = await db
        .select({ repositoryId: userRepositories.repositoryId })
        .from(userRepositories)
        .where(and(activeLinkOf(userId), eq(userRepositories.repositoryId, repositoryId)))
        .limit(1)
      return row
    },

    async revokeLink(userId: string, repositoryId: string): Promise<void> {
      await revokeWhere(and(activeLinkOf(userId), eq(userRepositories.repositoryId, repositoryId)))
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
      return db
        .select(linkedRepositoryColumns)
        .from(userRepositories)
        .innerJoin(repositories, eq(repositories.id, userRepositories.repositoryId))
        .where(and(activeLinkOf(userId), inArray(repositories.id, repositoryIds)))
    },

    searchLinked(userId: string, pattern: string, limit: number) {
      return db
        .select(linkedRepositoryColumns)
        .from(userRepositories)
        .innerJoin(repositories, eq(repositories.id, userRepositories.repositoryId))
        .where(and(activeLinkOf(userId), ilike(repositories.name, pattern)))
        .orderBy(repositories.name)
        .limit(limit)
    },

    listLinked(userId: string, page: { limit: number; cursor?: string }) {
      return db
        .select({
          repositoryId: repositories.id,
          owner: repositories.owner,
          name: repositories.name,
          isPrivate: repositories.isPrivate,
          defaultBranch: repositories.defaultBranch,
        })
        .from(userRepositories)
        .innerJoin(repositories, eq(repositories.id, userRepositories.repositoryId))
        .where(
          and(activeLinkOf(userId), page.cursor ? lt(repositories.id, page.cursor) : undefined),
        )
        .orderBy(desc(repositories.id))
        .limit(page.limit)
    },

    async revokeInstallation(installationId: number) {
      await revokeWhere(
        and(
          eq(userRepositories.installationId, installationId),
          isNull(userRepositories.revokedAt),
        ),
      )
    },

    async revokeInstallationRepositories(installationId: number, githubRepoIds: number[]) {
      const removed = db
        .select({ id: repositories.id })
        .from(repositories)
        .where(inArray(repositories.githubRepoId, githubRepoIds))
      await revokeWhere(
        and(
          eq(userRepositories.installationId, installationId),
          isNull(userRepositories.revokedAt),
          inArray(userRepositories.repositoryId, removed),
        ),
      )
    },

    async revokeRepository(githubRepoId: number) {
      const deleted = db
        .select({ id: repositories.id })
        .from(repositories)
        .where(eq(repositories.githubRepoId, githubRepoId))
      await revokeWhere(
        and(isNull(userRepositories.revokedAt), inArray(userRepositories.repositoryId, deleted)),
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
