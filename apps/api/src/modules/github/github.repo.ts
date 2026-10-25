import { and, eq, isNull, or, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { githubInstallations } from '../../platform/db/schema'

export const githubInstallationsRepo = (db: DbOrTx) => ({
  async findByInstallationId(githubInstallationId: number) {
    const [row] = await db
      .select({ userId: githubInstallations.userId, deletedAt: githubInstallations.deletedAt })
      .from(githubInstallations)
      .where(eq(githubInstallations.githubInstallationId, githubInstallationId))
      .limit(1)
    return row
  },

  listActiveForUser(userId: string) {
    return db
      .select({
        githubInstallationId: githubInstallations.githubInstallationId,
        accountLogin: githubInstallations.accountLogin,
      })
      .from(githubInstallations)
      .where(
        and(
          eq(githubInstallations.userId, userId),
          isNull(githubInstallations.deletedAt),
          isNull(githubInstallations.suspendedAt),
        ),
      )
  },

  async upsertForUser(input: {
    githubInstallationId: number
    userId: string
    accountLogin: string
    suspendedAt: Date | null
  }): Promise<boolean> {
    const written = await db
      .insert(githubInstallations)
      .values({ ...input, deletedAt: null })
      .onConflictDoUpdate({
        target: githubInstallations.githubInstallationId,
        set: {
          userId: input.userId,
          accountLogin: input.accountLogin,
          suspendedAt: input.suspendedAt,
          deletedAt: null,
        },
        setWhere: or(
          isNull(githubInstallations.deletedAt),
          eq(githubInstallations.userId, input.userId),
        ),
      })
      .returning({ id: githubInstallations.id })
    return written.length > 0
  },

  async syncMetadata(
    githubInstallationId: number,
    metadata: { accountLogin: string; suspendedAt: Date | null },
  ) {
    await db
      .update(githubInstallations)
      .set(metadata)
      .where(eq(githubInstallations.githubInstallationId, githubInstallationId))
  },

  async markDeleted(githubInstallationId: number) {
    await db
      .update(githubInstallations)
      .set({ deletedAt: sql`now()` })
      .where(eq(githubInstallations.githubInstallationId, githubInstallationId))
  },
})
