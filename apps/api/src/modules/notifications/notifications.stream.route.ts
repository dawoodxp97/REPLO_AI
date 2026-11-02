import { parseCookies } from '../../platform/cookies'
import type { App } from '../../platform/http'
import type { AuthService } from '../identity/auth.service'
import { SESSION_COOKIE } from '../identity/session'
import { sessionFromRequest } from '../identity/session-request'
import { KEEP_ALIVE_FRAME, openEventStream, sseFrame } from '../../platform/sse'
import type { NotificationsService } from './notifications.service'

export const UNREAD_POLL_MS = 5000
export const UNREAD_HEARTBEAT_MS = 15_000
export const MAX_STREAMS_PER_USER = 5

export interface NotificationsStreamDeps {
  auth: Pick<AuthService, 'currentSession'>
  notifications: Pick<NotificationsService, 'unreadCount'>
  productOrigin: string
  pollMs?: number
  heartbeatMs?: number
  sessionRecheckMs?: number
  maxStreamsPerUser?: number
}

const waitUnless = (ms: number, closed: Promise<void>) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    void closed.then(() => {
      clearTimeout(timer)
      resolve()
    })
  })

export function registerNotificationsStream(app: App, deps: NotificationsStreamDeps) {
  const pollMs = deps.pollMs ?? UNREAD_POLL_MS
  const heartbeatMs = deps.heartbeatMs ?? UNREAD_HEARTBEAT_MS
  const sessionRecheckMs = deps.sessionRecheckMs ?? heartbeatMs
  const maxStreams = deps.maxStreamsPerUser ?? MAX_STREAMS_PER_USER
  const streamsByUser = new Map<string, number>()

  app.get('/notifications/stream', async (request, reply) => {
    const session = await sessionFromRequest(deps.auth, request)
    if (!session) return reply.code(401).send({ error: 'UNAUTHORIZED' })

    const userId = session.user.id
    const active = streamsByUser.get(userId) ?? 0
    if (active >= maxStreams) {
      return reply.code(429).header('retry-after', '60').send({ error: 'TOO_MANY_STREAMS' })
    }
    streamsByUser.set(userId, active + 1)
    const release = () => {
      const remaining = (streamsByUser.get(userId) ?? 1) - 1
      if (remaining > 0) streamsByUser.set(userId, remaining)
      else streamsByUser.delete(userId)
    }

    const token = parseCookies(request.headers.cookie).get(SESSION_COOKIE)
    const closed = reply.raw.destroyed
      ? Promise.resolve()
      : new Promise<void>((resolve) => reply.raw.once('close', resolve))
    const stream = openEventStream(request, reply, deps.productOrigin)
    let lastCount: number | undefined
    let lastWrite = Date.now()
    let lastSessionCheck = Date.now()
    try {
      while (stream.isOpen() && !reply.raw.destroyed) {
        if (Date.now() - lastSessionCheck >= sessionRecheckMs) {
          if (!(await deps.auth.currentSession(token))) {
            stream.send(sseFrame({ event: 'unauthorized', data: {} }))
            break
          }
          lastSessionCheck = Date.now()
        }
        const { count } = await deps.notifications.unreadCount(userId)
        if (count !== lastCount) {
          stream.send(sseFrame({ event: 'unread', data: { count } }))
          lastCount = count
          lastWrite = Date.now()
        }
        if (Date.now() - lastWrite > heartbeatMs) {
          stream.send(KEEP_ALIVE_FRAME)
          lastWrite = Date.now()
        }
        await waitUnless(pollMs, closed)
      }
    } finally {
      release()
      stream.close()
    }
  })
}
