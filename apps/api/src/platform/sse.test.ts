import Fastify from 'fastify'
import { describe, expect, it } from 'vitest'
import { KEEP_ALIVE_FRAME, openEventStream, sseFrame } from './sse'

describe('sseFrame', () => {
  it('serialises id, event and json data', () => {
    expect(sseFrame({ id: 7, event: 'progress', data: { a: 1 } })).toBe(
      'id: 7\nevent: progress\ndata: {"a":1}\n\n',
    )
    expect(sseFrame({ event: 'ping', data: null })).toBe('event: ping\ndata: null\n\n')
  })
})

describe('server close with an open event stream', () => {
  it('finishes closing while a client is still connected', async () => {
    const app = Fastify({ forceCloseConnections: true })
    app.get('/stream', async (request, reply) => {
      const stream = openEventStream(request, reply, 'https://replo.test')
      stream.send(KEEP_ALIVE_FRAME)
    })
    const address = await app.listen({ port: 0, host: '127.0.0.1' })

    const response = await fetch(`${address}/stream`)
    const reader = response.body?.getReader()
    const first = await reader?.read()
    expect(new TextDecoder().decode(first?.value)).toBe(KEEP_ALIVE_FRAME)

    const closed = await Promise.race([
      app.close().then(() => 'closed'),
      new Promise((resolve) => setTimeout(() => resolve('hung'), 3_000)),
    ])
    expect(closed).toBe('closed')
    await reader?.cancel().catch(() => undefined)
  })
})
