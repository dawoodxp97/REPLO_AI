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
