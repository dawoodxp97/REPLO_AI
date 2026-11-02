import type { FastifyReply, FastifyRequest } from 'fastify'

export interface EventStream {
  isOpen(): boolean
  send(frame: string): void
  close(): void
}

export const KEEP_ALIVE_FRAME = ': keep-alive\n\n'

export function sseFrame(fields: { id?: number | string; event: string; data: unknown }): string {
  const id = fields.id === undefined ? '' : `id: ${fields.id}\n`
  return `${id}event: ${fields.event}\ndata: ${JSON.stringify(fields.data)}\n\n`
}

export function openEventStream(
  request: FastifyRequest,
  reply: FastifyReply,
  productOrigin: string,
): EventStream {
  reply.hijack()
  const res = reply.raw
  res.writeHead(200, {
    'content-type': 'text/event-stream; charset=utf-8',
    'cache-control': 'private, no-cache, no-transform',
    connection: 'keep-alive',
    'x-accel-buffering': 'no',
    ...(request.headers.origin === productOrigin
      ? {
          'access-control-allow-origin': productOrigin,
          'access-control-allow-credentials': 'true',
          vary: 'Origin',
        }
      : {}),
  })

  let open = true
  res.on('close', () => {
    open = false
  })

  return {
    isOpen: () => open && !res.writableEnded,
    send: (frame) => {
      if (open && !res.writableEnded) res.write(frame)
    },
    close: () => {
      open = false
      if (!res.writableEnded) res.end()
    },
  }
}

export interface PollingStreamOptions {
  stream: EventStream
  reply: FastifyReply
  pollMs: number
  heartbeatMs: number
  sessionRecheckMs: number
  sessionStillValid: () => Promise<boolean>
  unauthorizedFrame?: string
  tick: (send: (frame: string) => void) => Promise<'continue' | 'done'>
}

const waitUnless = (ms: number, closed: Promise<void>) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    void closed.then(() => {
      clearTimeout(timer)
      resolve()
    })
  })

export async function runPollingStream(options: PollingStreamOptions): Promise<void> {
  const { stream, reply } = options
  const closed = reply.raw.destroyed
    ? Promise.resolve()
    : new Promise<void>((resolve) => reply.raw.once('close', resolve))
  let lastWrite = Date.now()
  let lastSessionCheck = Date.now()
  const send = (frame: string) => {
    stream.send(frame)
    lastWrite = Date.now()
  }
  try {
    while (stream.isOpen() && !reply.raw.destroyed) {
      if (Date.now() - lastSessionCheck >= options.sessionRecheckMs) {
        lastSessionCheck = Date.now()
        if (!(await options.sessionStillValid())) {
          if (options.unauthorizedFrame) stream.send(options.unauthorizedFrame)
          break
        }
      }
      if ((await options.tick(send)) === 'done') break
      if (Date.now() - lastWrite > options.heartbeatMs) send(KEEP_ALIVE_FRAME)
      await waitUnless(options.pollMs, closed)
    }
  } finally {
    stream.close()
  }
}
