import type { App } from '../../platform/http'
import type { AuthService } from '../identity/auth.service'
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
  maxStreamsPerUser?: number
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export function registerNotificationsStream(app: App, deps: NotificationsStreamDeps) {
  const pollMs = deps.pollMs ?? UNREAD_POLL_MS
  const heartbeatMs = deps.heartbeatMs ?? UNREAD_HEARTBEAT_MS
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

    const stream = openEventStream(request, reply, deps.productOrigin)
    let lastCount: number | undefined
    let lastWrite = Date.now()
    try {
      while (stream.isOpen()) {
        const count = await deps.notifications.unreadCount(userId)
        if (count !== lastCount) {
          stream.send(sseFrame({ event: 'unread', data: { count } }))
          lastCount = count
          lastWrite = Date.now()
        }
        if (Date.now() - lastWrite > heartbeatMs) {
          stream.send(KEEP_ALIVE_FRAME)
          lastWrite = Date.now()
        }
        await sleep(pollMs)
      }
    } finally {
      release()
      stream.close()
    }
  })
}
