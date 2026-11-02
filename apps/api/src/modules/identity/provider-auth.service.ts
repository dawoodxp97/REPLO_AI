import { randomUUID } from 'node:crypto'
import type { AuthProvider } from '@replo/contracts'
import type { KeyVault } from '../../platform/crypto/key-vault'
import type { Db } from '../../platform/db/client'
import { ok, refused, type Outcome } from '../../platform/outcome'
import type { IssuedSession, ProviderAuth } from './auth.types'
import { sealGithubToken } from './github-token'
import { identityRepo, type IdentityRow } from './identity.repo'
import { sessionUserOf, type SessionService } from './session.service'

interface ProviderIdentityInput {
  userId: string
  provider: AuthProvider
  providerAccountId: string
  accessToken: string
  existing: IdentityRow | undefined
}

export function createProviderAuth(deps: {
  db: Db
  vault: Pick<KeyVault, 'seal'>
  sessions: Pick<SessionService, 'open'>
}): ProviderAuth {
  const { db, vault, sessions } = deps

  const upsertProviderIdentity = async (
    repo: ReturnType<typeof identityRepo>,
    { userId, provider, providerAccountId, accessToken, existing }: ProviderIdentityInput,
  ) => {
    const sealed = provider === 'github' ? sealGithubToken(vault, userId, accessToken) : undefined
    if (!existing) return repo.insertIdentity({ userId, provider, providerAccountId, ...sealed })
    if (sealed) await repo.updateIdentityToken(existing.id, sealed)
  }

  return {
    signInWithProvider({ provider, profile, accessToken }) {
      return db.transaction(
        async (tx): Promise<Outcome<IssuedSession, 'ACCOUNT_EXISTS' | 'EMAIL_NOT_VERIFIED'>> => {
          const repo = identityRepo(tx)
          const linked = await repo.identityByProviderAccount(provider, profile.providerAccountId)

          if (linked) {
            const owner = await repo.userById(linked.userId)
            if (!owner) throw new Error('auth identity points at a missing user')
            await upsertProviderIdentity(repo, {
              userId: owner.id,
              provider,
              providerAccountId: profile.providerAccountId,
              accessToken,
              existing: linked,
            })
            const issued = await sessions.open(tx, owner.id)
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
          await upsertProviderIdentity(repo, {
            userId: owner.id,
            provider,
            providerAccountId: profile.providerAccountId,
            accessToken,
            existing: undefined,
          })
          const issued = await sessions.open(tx, owner.id)
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

          await upsertProviderIdentity(repo, {
            userId,
            provider,
            providerAccountId: profile.providerAccountId,
            accessToken,
            existing: current,
          })

          if (profile.email && profile.emailVerified)
            await repo.markEmailVerified(userId, profile.email)
          return ok(true as const)
        },
      )
    },
  }
}
