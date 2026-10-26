import { randomBytes } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { KeyVault } from '../../platform/crypto/key-vault'
import { authIdentity, session, user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import type { Outcome } from '../../platform/outcome'
import { createAuthService, type AuthService } from './auth.service'
import { createIdentityService, type IdentityService } from './identity.service'
import type { OAuthProfile } from './oauth'
import { hashSessionToken } from './session'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

const valueOf = <T, R>(outcome: Outcome<T, R>): T => {
  if (outcome.kind !== 'ok') throw new Error(`refused: ${String(outcome.refusal)}`)
  return outcome.value
}

const profile = (overrides: Partial<OAuthProfile> = {}): OAuthProfile => ({
  providerAccountId: '42',
  email: 'ada@example.com',
  emailVerified: true,
  name: 'Ada',
  image: null,
  ...overrides,
})

describe.skipIf(DATABASE_URL === '')('auth against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let auth: AuthService
  let identity: IdentityService
  const vault = KeyVault.fromEnv(randomBytes(32).toString('base64'), 1)

  const signUp = async (email: string, password = 'correct horse') =>
    valueOf(await auth.signUp({ name: 'Developer', email, password }))

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 2 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    auth = createAuthService({ db, vault, enabled: { google: true, github: true } })
    identity = createIdentityService({
      db,
      vault,
      tutorials: { settleOwnerDeletion: async () => undefined },
    })
  })

  afterAll(async () => {
    await pool.end()
  })

  beforeEach(async () => {
    await db.execute(sql`truncate table "user" cascade`)
  })

  describe('password accounts', () => {
    it('signs up, signs in again and resolves the session token', async () => {
      const created = await signUp('ada@example.com')

      expect(await auth.currentSession(created.token)).toEqual({
        sessionId: created.sessionId,
        user: created.user,
      })
      const again = valueOf(
        await auth.signIn({ email: 'ada@example.com', password: 'correct horse' }),
      )
      expect(again.user.id).toBe(created.user.id)
      expect(again.token).not.toBe(created.token)
    })

    it('refuses a second account for the same email', async () => {
      await signUp('ada@example.com')
      expect(
        await auth.signUp({
          name: 'Other',
          email: 'ada@example.com',
          password: 'another password',
        }),
      ).toEqual({ kind: 'refused', refusal: 'EMAIL_TAKEN' })
    })

    it('answers the same refusal for a wrong password and for an unknown email', async () => {
      await signUp('ada@example.com')
      const wrongPassword = await auth.signIn({ email: 'ada@example.com', password: 'nope nope' })
      const unknown = await auth.signIn({ email: 'nobody@example.com', password: 'nope nope' })
      expect(wrongPassword).toEqual({ kind: 'refused', refusal: 'INVALID_CREDENTIALS' })
      expect(unknown).toEqual({ kind: 'refused', refusal: 'INVALID_CREDENTIALS' })
    })

    it('stores a scrypt hash of the password and only a hash of the session token', async () => {
      const created = await signUp('ada@example.com')
      const [identityRow] = await db
        .select({ passwordHash: authIdentity.passwordHash })
        .from(authIdentity)
        .where(eq(authIdentity.userId, created.user.id))
      const [sessionRow] = await db
        .select({ tokenHash: session.tokenHash })
        .from(session)
        .where(eq(session.id, created.sessionId))

      expect(identityRow?.passwordHash?.startsWith('scrypt$')).toBe(true)
      expect(identityRow?.passwordHash).not.toContain('correct horse')
      expect(sessionRow?.tokenHash).toBe(hashSessionToken(created.token))
      expect(sessionRow?.tokenHash).not.toContain(created.token)
    })

    it('ends a session on sign-out and ignores one past its lifetime', async () => {
      const created = await signUp('ada@example.com')
      await auth.endSession(created.sessionId)
      expect(await auth.currentSession(created.token)).toBeNull()

      const signedIn = valueOf(
        await auth.signIn({ email: 'ada@example.com', password: 'correct horse' }),
      )
      await db
        .update(session)
        .set({ expiresAt: new Date(Date.now() - 1000) })
        .where(eq(session.id, signedIn.sessionId))
      expect(await auth.currentSession(signedIn.token)).toBeNull()
    })

    it('revokes every session except the one that is kept', async () => {
      const first = await signUp('ada@example.com')
      const second = valueOf(
        await auth.signIn({ email: 'ada@example.com', password: 'correct horse' }),
      )
      const third = valueOf(
        await auth.signIn({ email: 'ada@example.com', password: 'correct horse' }),
      )

      await auth.revokeOtherSessions(first.user.id, second.sessionId)

      expect(await auth.currentSession(first.token)).toBeNull()
      expect(await auth.currentSession(third.token)).toBeNull()
      expect((await auth.currentSession(second.token))?.sessionId).toBe(second.sessionId)
    })
  })

  describe('GitHub and Google sign-in', () => {
    it('creates a verified account from a GitHub login and keeps the GitHub token sealed', async () => {
      const signedIn = valueOf(
        await auth.signInWithProvider({
          provider: 'github',
          profile: profile(),
          accessToken: 'gho_first',
        }),
      )

      expect(signedIn.user.email).toBe('ada@example.com')
      expect(await identity.githubAccessToken(signedIn.user.id)).toBe('gho_first')
      const [row] = await db
        .select({ ciphertext: authIdentity.accessTokenCiphertext })
        .from(authIdentity)
        .where(eq(authIdentity.userId, signedIn.user.id))
      expect(row?.ciphertext).not.toContain('gho_first')
      expect(await identity.signInMethods(signedIn.user.id)).toEqual({
        password: false,
        google: false,
        github: true,
      })
    })

    it('refreshes the stored GitHub token on the next GitHub login', async () => {
      const first = valueOf(
        await auth.signInWithProvider({
          provider: 'github',
          profile: profile(),
          accessToken: 'gho_first',
        }),
      )
      valueOf(
        await auth.signInWithProvider({
          provider: 'github',
          profile: profile(),
          accessToken: 'gho_second',
        }),
      )

      expect(await identity.githubAccessToken(first.user.id)).toBe('gho_second')
      const rows = await db
        .select()
        .from(authIdentity)
        .where(eq(authIdentity.userId, first.user.id))
      expect(rows).toHaveLength(1)
    })

    it('stores no GitHub token for a Google login', async () => {
      const signedIn = valueOf(
        await auth.signInWithProvider({
          provider: 'google',
          profile: profile({ providerAccountId: 'google-sub-1' }),
          accessToken: 'ya29.google',
        }),
      )
      expect(await identity.githubAccessToken(signedIn.user.id)).toBeUndefined()
      expect(await identity.signInMethods(signedIn.user.id)).toEqual({
        password: false,
        google: true,
        github: false,
      })
    })

    it('links a provider to an existing verified account that has the same email', async () => {
      const viaGoogle = valueOf(
        await auth.signInWithProvider({
          provider: 'google',
          profile: profile({ providerAccountId: 'google-sub-1' }),
          accessToken: 'ya29.google',
        }),
      )
      const viaGithub = valueOf(
        await auth.signInWithProvider({
          provider: 'github',
          profile: profile(),
          accessToken: 'gho_1',
        }),
      )

      expect(viaGithub.user.id).toBe(viaGoogle.user.id)
      expect(await identity.signInMethods(viaGoogle.user.id)).toEqual({
        password: false,
        google: true,
        github: true,
      })
    })

    it('refuses a provider login whose email belongs to an unverified password account', async () => {
      await signUp('bo@example.com')

      expect(
        await auth.signInWithProvider({
          provider: 'google',
          profile: profile({ providerAccountId: 'google-sub-2', email: 'bo@example.com' }),
          accessToken: 'ya29.google',
        }),
      ).toEqual({ kind: 'refused', refusal: 'ACCOUNT_EXISTS' })
    })

    it('refuses a provider login whose email the provider has not verified', async () => {
      expect(
        await auth.signInWithProvider({
          provider: 'github',
          profile: profile({ email: null, emailVerified: false }),
          accessToken: 'gho_1',
        }),
      ).toEqual({ kind: 'refused', refusal: 'EMAIL_NOT_VERIFIED' })
    })
  })

  describe('linking from settings', () => {
    it('links a provider to the signed-in account and marks the matching email verified', async () => {
      const created = await signUp('cy@example.com')

      const linked = await auth.linkProvider({
        userId: created.user.id,
        provider: 'google',
        profile: profile({ providerAccountId: 'google-sub-3', email: 'cy@example.com' }),
        accessToken: 'ya29.google',
      })

      expect(linked).toEqual({ kind: 'ok', value: true })
      const [row] = await db.select().from(user).where(eq(user.id, created.user.id))
      expect(row?.emailVerified).toBe(true)
      expect(await identity.signInMethods(created.user.id)).toEqual({
        password: true,
        google: true,
        github: false,
      })
    })

    it('will not link an identity that another account already holds', async () => {
      const holder = valueOf(
        await auth.signInWithProvider({
          provider: 'github',
          profile: profile(),
          accessToken: 'gho_1',
        }),
      )
      const other = await signUp('bo@example.com')

      expect(
        await auth.linkProvider({
          userId: other.user.id,
          provider: 'github',
          profile: profile(),
          accessToken: 'gho_2',
        }),
      ).toEqual({ kind: 'refused', refusal: 'IDENTITY_IN_USE' })
      expect(await identity.githubAccessToken(holder.user.id)).toBe('gho_1')
    })

    it('will not link a second GitHub account to an account that already has one', async () => {
      const signedIn = valueOf(
        await auth.signInWithProvider({
          provider: 'github',
          profile: profile(),
          accessToken: 'gho_1',
        }),
      )

      expect(
        await auth.linkProvider({
          userId: signedIn.user.id,
          provider: 'github',
          profile: profile({ providerAccountId: '99' }),
          accessToken: 'gho_2',
        }),
      ).toEqual({ kind: 'refused', refusal: 'PROVIDER_ALREADY_LINKED' })
    })
  })
})
