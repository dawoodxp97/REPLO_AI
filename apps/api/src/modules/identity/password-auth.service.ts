import { randomUUID } from 'node:crypto'
import type { Db } from '../../platform/db/client'
import { ok, refused, type Outcome } from '../../platform/outcome'
import type { IssuedSession, PasswordAuth } from './auth.types'
import { identityRepo } from './identity.repo'
import { hashPassword, verifyPassword } from './password'
import { sessionUserOf, type SessionService } from './session.service'

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false
  if ('code' in error && error.code === '23505') return true
  return 'cause' in error && isUniqueViolation(error.cause)
}

let decoy: Promise<string> | undefined
const decoyPasswordHash = () => (decoy ??= hashPassword(randomUUID()))

export function createPasswordAuth(deps: {
  db: Db
  sessions: Pick<SessionService, 'open'>
}): PasswordAuth {
  const { db, sessions } = deps
  return {
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
          const issued = await sessions.open(tx, created.id)
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
      const issued = await sessions.open(db, account.user.id)
      return ok({ ...issued, user: sessionUserOf(account.user) })
    },
  }
}
