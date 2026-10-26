import { and, eq, gt, ne } from 'drizzle-orm'
import type { AuthProvider } from '@replo/contracts'
import type { DbOrTx } from '../../platform/db/client'
import { authIdentity, session, user } from '../../platform/db/auth-schema'

export type UserRow = typeof user.$inferSelect
export type IdentityRow = typeof authIdentity.$inferSelect

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
    const [row] = await db.select().from(user).where(eq(user.id, userId)).limit(1)
    return row
  },

  async userByEmail(email: string): Promise<UserRow | undefined> {
    const [row] = await db.select().from(user).where(eq(user.email, email)).limit(1)
    return row
  },

  async insertUser(values: {
    id: string
    name: string
    email: string
    emailVerified: boolean
    image: string | null
  }): Promise<UserRow> {
    const [row] = await db.insert(user).values(values).returning()
    if (!row) throw new Error('user insert returned no row')
    return row
  },

  async markEmailVerified(userId: string, email: string): Promise<void> {
    await db
      .update(user)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(and(eq(user.id, userId), eq(user.email, email)))
  },

  async deleteUser(userId: string): Promise<void> {
    await db.delete(user).where(eq(user.id, userId))
  },

  async passwordAccountByEmail(
    email: string,
  ): Promise<{ user: UserRow; passwordHash: string | null } | undefined> {
    const [row] = await db
      .select({ user, passwordHash: authIdentity.passwordHash })
      .from(user)
      .leftJoin(
        authIdentity,
        and(eq(authIdentity.userId, user.id), eq(authIdentity.provider, 'password')),
      )
      .where(eq(user.email, email))
      .limit(1)
    return row
  },

  async identityByProviderAccount(
    provider: AuthProvider,
    providerAccountId: string,
  ): Promise<IdentityRow | undefined> {
    const [row] = await db
      .select()
      .from(authIdentity)
      .where(
        and(
          eq(authIdentity.provider, provider),
          eq(authIdentity.providerAccountId, providerAccountId),
        ),
      )
      .limit(1)
    return row
  },

  async identityFor(userId: string, provider: AuthProvider): Promise<IdentityRow | undefined> {
    const [row] = await db
      .select()
      .from(authIdentity)
      .where(and(eq(authIdentity.userId, userId), eq(authIdentity.provider, provider)))
      .limit(1)
    return row
  },

  async identitiesOf(userId: string): Promise<IdentityRow[]> {
    return db.select().from(authIdentity).where(eq(authIdentity.userId, userId))
  },

  async insertIdentity(values: NewIdentity): Promise<void> {
    await db.insert(authIdentity).values(values)
  },

  async updateIdentityToken(identityId: string, token: SealedTokenColumns): Promise<void> {
    await db
      .update(authIdentity)
      .set({ ...token, updatedAt: new Date() })
      .where(eq(authIdentity.id, identityId))
  },

  async insertSession(values: {
    tokenHash: string
    userId: string
    expiresAt: Date
  }): Promise<string> {
    const [row] = await db.insert(session).values(values).returning({ id: session.id })
    if (!row) throw new Error('session insert returned no row')
    return row.id
  },

  async sessionByTokenHash(
    tokenHash: string,
    now: Date,
  ): Promise<{ sessionId: string; user: UserRow } | undefined> {
    const [row] = await db
      .select({ sessionId: session.id, user })
      .from(session)
      .innerJoin(user, eq(user.id, session.userId))
      .where(and(eq(session.tokenHash, tokenHash), gt(session.expiresAt, now)))
      .limit(1)
    return row
  },

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(session).where(eq(session.id, sessionId))
  },

  async deleteOtherSessions(userId: string, keepSessionId: string): Promise<void> {
    await db.delete(session).where(and(eq(session.userId, userId), ne(session.id, keepSessionId)))
  },
})
