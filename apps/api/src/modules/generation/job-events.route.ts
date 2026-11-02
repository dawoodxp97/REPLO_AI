import type { App } from '../../platform/http'
import { z } from 'zod'
import type { AuthService } from '../identity/auth.service'
import { sessionFromRequest, sessionTokenOf } from '../identity/session-request'
import type { Db } from '../../platform/db/client'
import type { jobEvents } from '../../platform/db/schema'
import { openEventStream, runPollingStream, sseFrame } from '../../platform/sse'
import { isTerminalStatus } from '../../platform/job-status'
import { jobsRepo } from './generation.repo'

const LastEventId = z.coerce.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER)

export const JOB_EVENTS_POLL_MS = 1000
export const JOB_EVENTS_HEARTBEAT_MS = 15_000
export const JOB_EVENTS_SESSION_RECHECK_MS = 30_000

const toSseFrame = (event: typeof jobEvents.$inferSelect) =>
  sseFrame({
    id: event.id,
    event: event.type,
    data: {
      id: event.id,
      jobId: event.jobId,
      type: event.type,
      stage: event.stage,
      data: event.data,
      at: event.at.toISOString(),
    },
  })

export interface JobEventsDeps {
  db: Db
  auth: Pick<AuthService, 'currentSession'>
  productOrigin: string
  pollMs?: number
  heartbeatMs?: number
  sessionRecheckMs?: number
}

export function registerJobEventsRoute(app: App, deps: JobEventsDeps) {
  const pollMs = deps.pollMs ?? JOB_EVENTS_POLL_MS
  const heartbeatMs = deps.heartbeatMs ?? JOB_EVENTS_HEARTBEAT_MS
  const sessionRecheckMs = deps.sessionRecheckMs ?? JOB_EVENTS_SESSION_RECHECK_MS

  app.get<{ Params: { id: string } }>('/jobs/:id/events', async (request, reply) => {
    const session = await sessionFromRequest(deps.auth, request)
    const jobId = z.uuid().safeParse(request.params.id)
    if (!session || !jobId.success) return reply.code(404).send({ error: 'NOT_FOUND' })

    const jobs = jobsRepo(deps.db)
    const job = await jobs.findOwned(jobId.data, session.user.id)
    if (!job) return reply.code(404).send({ error: 'NOT_FOUND' })

    const lastEventId = LastEventId.safeParse(request.headers['last-event-id'] ?? 0)
    let cursor = lastEventId.success ? lastEventId.data : 0
    const closedAtConnect = isTerminalStatus(job.status)

    const stream = openEventStream(request, reply, deps.productOrigin)
    const sessionToken = sessionTokenOf(request)

    const flush = async (send: (frame: string) => void) => {
      let last: typeof jobEvents.$inferSelect | undefined
      let events = await jobs.eventsAfter(job.id, cursor)
      while (events.length > 0 && stream.isOpen()) {
        for (const event of events) {
          cursor = event.id
          last = event
          send(toSseFrame(event))
        }
        events = await jobs.eventsAfter(job.id, cursor)
      }
      return last
    }

    await runPollingStream({
      stream,
      reply,
      pollMs,
      heartbeatMs,
      sessionRecheckMs,
      sessionStillValid: async () =>
        (await deps.auth.currentSession(sessionToken))?.user.id === session.user.id,
      tick: async (send) => {
        const last = await flush(send)
        return closedAtConnect || (last && isTerminalStatus(last.type)) ? 'done' : 'continue'
      },
    })
  })
}
