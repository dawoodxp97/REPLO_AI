import type { App } from '../../platform/http'
import { z } from 'zod'
import type { Auth } from '../identity/auth'
import { sessionFromRequest } from '../identity/auth'
import type { Db } from '../../platform/db/client'
import type { jobEvents } from '../../platform/db/schema'
import { KEEP_ALIVE_FRAME, openEventStream, sseFrame } from '../../platform/sse'
import { TERMINAL_STATUSES, isStatusIn, jobsRepo } from './generation.repo'

export const JOB_EVENTS_POLL_MS = 1000
export const JOB_EVENTS_HEARTBEAT_MS = 15_000

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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export interface JobEventsDeps {
  db: Db
  auth: Auth
  productOrigin: string
  pollMs?: number
  heartbeatMs?: number
}

export function registerJobEventsRoute(app: App, deps: JobEventsDeps) {
  const pollMs = deps.pollMs ?? JOB_EVENTS_POLL_MS
  const heartbeatMs = deps.heartbeatMs ?? JOB_EVENTS_HEARTBEAT_MS

  app.get<{ Params: { id: string } }>('/jobs/:id/events', async (request, reply) => {
    const session = await sessionFromRequest(deps.auth, request)
    const jobId = z.uuid().safeParse(request.params.id)
    if (!session || !jobId.success) return reply.code(404).send({ error: 'NOT_FOUND' })

    const jobs = jobsRepo(deps.db)
    const job = await jobs.findOwned(jobId.data, session.user.id)
    if (!job) return reply.code(404).send({ error: 'NOT_FOUND' })

    const lastEventId = Number(request.headers['last-event-id'] ?? 0)
    let cursor = Number.isFinite(lastEventId) ? lastEventId : 0

    const stream = openEventStream(request, reply, deps.productOrigin)
    let lastWrite = Date.now()

    const flush = async () => {
      let events = await jobs.eventsAfter(job.id, cursor)
      while (events.length > 0 && stream.isOpen()) {
        for (const event of events) {
          cursor = event.id
          stream.send(toSseFrame(event))
          lastWrite = Date.now()
        }
        events = await jobs.eventsAfter(job.id, cursor)
      }
    }

    try {
      while (stream.isOpen()) {
        await flush()
        const current = await jobs.findById(job.id)
        if (!current || isStatusIn(TERMINAL_STATUSES, current.status)) {
          await flush()
          break
        }
        if (Date.now() - lastWrite > heartbeatMs) {
          stream.send(KEEP_ALIVE_FRAME)
          lastWrite = Date.now()
        }
        await sleep(pollMs)
      }
    } finally {
      stream.close()
    }
  })
}
