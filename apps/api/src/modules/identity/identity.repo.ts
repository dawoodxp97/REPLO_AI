import { and, eq, gt, lte, ne } from 'drizzle-orm'
import type { AuthProvider } from '@replo/contracts'
import type { DbOrTx } from '../../platform/db/client'
import { authIdentities, sessions, users } from '../../platform/db/auth-schema'

export type UserRow = typeof users.$inferSelect
export type IdentityRow = typeof authIdentities.$inferSelect

export interface NewIdentity {
  userId: string
  provider: AuthProvider
  providerAccountId: string
  passwordHash?: string
  accessTokenCiphertext?: string
  accessTokenIv?: string
  accessTokenKeyVersion?: number
}

export interface SealedTokenColumns {
  accessTokenCiphertext: string
  accessTokenIv: string
  accessTokenKeyVersion: number
}

export const identityRepo = (db: DbOrTx) => ({
  async userById(userId: string): Promise<UserRow | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1)
    return row
  },

  async userByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return row
  },

  async insertUser(values: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
  }): Promise<UserRow> {
    const [row] = await db.insert(users).values(values).returning()
    if (!row) throw new Error('user insert returned no row')
    return row
  },

  async markEmailVerified(userId: string, email: string): Promise<void> {
    await db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(and(eq(users.id, userId), eq(users.email, email)))
  },

  async deleteUser(userId: string): Promise<void> {
    await db.delete(users).where(eq(users.id, userId))
  },

  async passwordAccountByEmail(
    email: string,
  ): Promise<{ user: UserRow; passwordHash: string | null } | undefined> {
    const [row] = await db
      .select({ user: users, passwordHash: authIdentities.passwordHash })
      .from(users)
      .leftJoin(
        authIdentities,
        and(eq(authIdentities.userId, users.id), eq(authIdentities.provider, 'password')),
      )
      .where(eq(users.email, email))
      .limit(1)
    return row
  },

  async identityByProviderAccount(
    provider: AuthProvider,
    providerAccountId: string,
  ): Promise<IdentityRow | undefined> {
    const [row] = await db
      .select()
      .from(authIdentities)
      .where(
        and(
          eq(authIdentities.provider, provider),
          eq(authIdentities.providerAccountId, providerAccountId),
        ),
      )
      .limit(1)
    return row
  },

  async identityFor(userId: string, provider: AuthProvider): Promise<IdentityRow | undefined> {
    const [row] = await db
      .select()
      .from(authIdentities)
      .where(and(eq(authIdentities.userId, userId), eq(authIdentities.provider, provider)))
      .limit(1)
    return row
  },

  async providersOf(userId: string): Promise<string[]> {
    const rows = await db
      .select({ provider: authIdentities.provider })
      .from(authIdentities)
      .where(eq(authIdentities.userId, userId))
    return rows.map((row) => row.provider)
  },

  async insertIdentity(values: NewIdentity): Promise<void> {
    await db.insert(authIdentities).values(values)
  },

  async updateIdentityToken(identityId: string, token: SealedTokenColumns): Promise<void> {
    await db
      .update(authIdentities)
      .set({ ...token, updatedAt: new Date() })
      .where(eq(authIdentities.id, identityId))
  },

  async insertSession(values: {
    tokenHash: string
    userId: string
    expiresAt: Date
  }): Promise<string> {
    const [row] = await db.insert(sessions).values(values).returning({ id: sessions.id })
    if (!row) throw new Error('session insert returned no row')
    return row.id
  },

  async sessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<{ sessionId: string; user: UserRow } | undefined> {
    const [row] = await db
      .select({ sessionId: sessions.id, user: users })
      .from(sessions)
      .innerJoin(users, eq(users.id, sessions.userId))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .limit(1)
    return row
  },

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId))
  },

  async deleteExpiredSessions(now: Date): Promise<number> {
    const result = await db.delete(sessions).where(lte(sessions.expiresAt, now))
    return result.rowCount ?? 0
  },

  async deleteOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    await db.delete(sessions).where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)))
  },
})
