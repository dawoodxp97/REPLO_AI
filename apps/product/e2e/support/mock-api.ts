import { createServer, type IncomingMessage, type Server } from 'node:http'
import { APP_ORIGIN } from './origins'
import { rpcError, type RpcHandlers } from './rpc-types'

const corsHeadersFor = (request: IncomingMessage) => ({
  'access-control-allow-origin': APP_ORIGIN,
  'access-control-allow-credentials': 'true',
  'access-control-allow-headers':
    request.headers['access-control-request-headers'] ?? 'content-type',
  'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
})

export function createMockApi(handlers: RpcHandlers): Server {
  return createServer(async (request, response) => {
    const cors = corsHeadersFor(request)
    if (request.method === 'OPTIONS') {
      response.writeHead(204, cors).end()
      return
    }

    const url = new URL(request.url ?? '/', APP_ORIGIN)
    if (!url.pathname.startsWith('/rpc/')) {
      response.writeHead(404, cors).end()
      return
    }

    const path = url.pathname.slice('/rpc/'.length).replaceAll('/', '.')
    const handler = handlers[path]
    const reply = handler
      ? await handler({ path, input: await readInput(request), headers: {} })
      : rpcError('NOT_FOUND', 404)

    response.writeHead(reply.status ?? 200, { 'content-type': 'application/json', ...cors })
    response.end(JSON.stringify({ json: reply.body }))
  })
}

async function readInput(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  const text = Buffer.concat(chunks).toString('utf8')
  if (!text) return undefined
  const wire: unknown = JSON.parse(text)
  return typeof wire === 'object' && wire !== null && 'json' in wire ? wire.json : undefined
}
