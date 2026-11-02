import type { Db, DbOrTx } from '../../platform/db/client'
import type { SessionLifecycle, SessionUser } from './auth.types'
import { identityRepo, type UserRow } from './identity.repo'
import { hashSessionToken, newSessionToken, SESSION_LIFETIME_MS } from './session'

export const sessionUserOf = (row: UserRow): SessionUser => ({
  id: row.id,
  name: row.name,
  email: row.email,
  image: row.image,
})

export interface SessionService extends SessionLifecycle {
  open(tx: DbOrTx, userId: string): Promise<{ token: string; sessionId: string }>
  purgeExpired(now: Date): Promise<number>
}

export function createSessionService(db: Db): SessionService {
  return {
    async open(tx, userId) {
      const token = newSessionToken()
      const sessionId = await identityRepo(tx).insertSession({
        tokenHash: hashSessionToken(token),
        userId,
        expiresAt: new Date(Date.now() + SESSION_LIFETIME_MS),
      })
      return { token, sessionId }
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

    purgeExpired(now) {
      return identityRepo(db).deleteExpiredSessions(now)
    },
  }
}
