import { randomUUID } from 'node:crypto'
import type {
  AuthProvider,
  EnabledProvidersDto,
  OAuthProvider,
  SignInInput,
  SignUpInput,
} from '@replo/contracts'
import type { SessionUser } from '../../context'
import type { KeyVault } from '../../platform/crypto/key-vault'
import type { Db, DbOrTx } from '../../platform/db/client'
import { ok, refused, type Outcome } from '../../platform/outcome'
import { sealGithubToken } from './github-token'
import { identityRepo, type SealedTokenColumns, type UserRow } from './identity.repo'
import type { OAuthProfile } from './oauth'
import { hashPassword, verifyPassword } from './password'
import { hashSessionToken, newSessionToken, SESSION_LIFETIME_MS } from './session'

export interface IssuedSession {
  token: string
  sessionId: string
  user: SessionUser
}

export interface CurrentSession {
  sessionId: string
  user: SessionUser
}

export interface ProviderGrant {
  provider: OAuthProvider
  profile: OAuthProfile
  accessToken: string
}

export interface ProviderLink extends ProviderGrant {
  userId: string
}

export interface AuthService {
  enabledProviders(): EnabledProvidersDto
  signUp(input: SignUpInput): Promise<Outcome<IssuedSession, 'EMAIL_TAKEN'>>
  signIn(input: SignInInput): Promise<Outcome<IssuedSession, 'INVALID_CREDENTIALS'>>
  signInWithProvider(
    grant: ProviderGrant,
  ): Promise<Outcome<IssuedSession, 'ACCOUNT_EXISTS' | 'EMAIL_NOT_VERIFIED'>>
  linkProvider(
    link: ProviderLink,
  ): Promise<Outcome<true, 'IDENTITY_IN_USE' | 'PROVIDER_ALREADY_LINKED'>>
  currentSession(token: string | undefined): Promise<CurrentSession | null>
  endSession(sessionId: string): Promise<void>
  revokeOtherSessions(userId: string, keepSessionId: string): Promise<void>
}

const sessionUserOf = (row: UserRow): SessionUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  image: row.image,
})

const tokenFor = (
  vault: Pick<KeyVault, 'seal'>,
  provider: AuthProvider,
  userId: string,
  accessToken: string,
): SealedTokenColumns | undefined =>
  provider === 'github' ? sealGithubToken(vault, userId, accessToken) : undefined

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('code' in error && error.code === '23505') return true
  return 'cause' in error && isUniqueViolation(error.cause)
}

let decoy: Promise<string> | undefined
const decoyPasswordHash = () => (decoy ??= hashPassword(randomUUID()))

export function createAuthService(deps: {
  db: Db
  vault: Pick<KeyVault, 'seal'>
  enabled: EnabledProvidersDto
}): AuthService {
  const { db, vault } = deps

  const openSession = async (tx: DbOrTx, userId: string) => {
    const token = newSessionToken()
    const sessionId = await identityRepo(tx).insertSession({
      tokenHash: hashSessionToken(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
    })
    return { token, sessionId }
  }

  return {
    enabledProviders: () => deps.enabled,

    async signUp(input) {
      const passwordHash = await hashPassword(input.password)
      try {
        return await db.transaction(async (tx): Promise<Outcome<IssuedSession, 'EMAIL_TAKEN'>> => {
          const repo = identityRepo(tx)
          if (await repo.userByEmail(input.email)) return refused('EMAIL_TAKEN')
          const created = await repo.insertUser({
            id: randomUUID(),
            name: input.name,
            email: input.email,
            emailVerified: false,
            image: null,
          })
          await repo.insertIdentity({
            userId: created.id,
            provider: 'password',
            providerAccountId: created.id,
            passwordHash,
          })
          const issued = await openSession(tx, created.id)
          return ok({ ...issued, user: sessionUserOf(created) })
        })
      } catch (error) {
        if (isUniqueViolation(error)) return refused('EMAIL_TAKEN')
        throw error
      }
    },

    async signIn(input) {
      const account = await identityRepo(db).passwordAccountByEmail(input.email)
      const matches = await verifyPassword(
        input.password,
        account?.passwordHash ?? (await decoyPasswordHash()),
      )
      if (!account || !account.passwordHash || !matches) return refused('INVALID_CREDENTIALS')
      const issued = await openSession(db, account.user.id)
      return ok({ ...issued, user: sessionUserOf(account.user) })
    },

    signInWithProvider({ provider, profile, accessToken }) {
      return db.transaction(
        async (tx): Promise<Outcome<IssuedSession, 'ACCOUNT_EXISTS' | 'EMAIL_NOT_VERIFIED'>> => {
          const repo = identityRepo(tx)
          const linked = await repo.identityByProviderAccount(provider, profile.providerAccountId)

          if (linked) {
            const owner = await repo.userById(linked.userId)
            if (!owner) throw new Error('auth identity points at a missing user')
            const token = tokenFor(vault, provider, owner.id, accessToken)
            if (token) await repo.updateIdentityToken(linked.id, token)
            const issued = await openSession(tx, owner.id)
            return ok({ ...issued, user: sessionUserOf(owner) })
          }

          if (!profile.email || !profile.emailVerified) return refused('EMAIL_NOT_VERIFIED')
          const existing = await repo.userByEmail(profile.email)
          if (existing && !existing.emailVerified) return refused('ACCOUNT_EXISTS')

          const owner =
            existing ??
            (await repo.insertUser({
              id: randomUUID(),
              name: profile.name ?? profile.email,
              email: profile.email,
              emailVerified: true,
              image: profile.image,
            }))
          await repo.insertIdentity({
            userId: owner.id,
            provider,
            providerAccountId: profile.providerAccountId,
            ...tokenFor(vault, provider, owner.id, accessToken),
          })
          const issued = await openSession(tx, owner.id)
          return ok({ ...issued, user: sessionUserOf(owner) })
        },
      )
    },

    linkProvider({ userId, provider, profile, accessToken }) {
      return db.transaction(
        async (tx): Promise<Outcome<true, 'IDENTITY_IN_USE' | 'PROVIDER_ALREADY_LINKED'>> => {
          const repo = identityRepo(tx)
          const holder = await repo.identityByProviderAccount(provider, profile.providerAccountId)
          if (holder && holder.userId !== userId) return refused('IDENTITY_IN_USE')

          const current = await repo.identityFor(userId, provider)
          if (current && current.providerAccountId !== profile.providerAccountId)
            return refused('PROVIDER_ALREADY_LINKED')

          if (current) {
            const token = tokenFor(vault, provider, userId, accessToken)
            if (token) await repo.updateIdentityToken(current.id, token)
          } else {
            await repo.insertIdentity({
              userId,
              provider,
              providerAccountId: profile.providerAccountId,
              ...tokenFor(vault, provider, userId, accessToken),
            })
          }

          if (profile.email && profile.emailVerified)
            await repo.markEmailVerified(userId, profile.email)
          return ok(true as const)
        },
      )
    },

    async currentSession(token) {
      if (!token) return null
      const row = await identityRepo(db).sessionByTokenHash(hashSessionToken(token), new Date())
      return row ? { sessionId: row.sessionId, user: sessionUserOf(row.user) } : null
    },

    async endSession(sessionId) {
      await identityRepo(db).deleteSession(sessionId)
    },

    async revokeOtherSessions(userId, keepSessionId) {
      await identityRepo(db).deleteOtherSessions(userId, keepSessionId)
    },
  }
}
