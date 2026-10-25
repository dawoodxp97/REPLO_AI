import type { Page, Request, Route } from '@playwright/test'
import { defaultHandlers } from '../fixtures/handlers'
import { API_URL, APP_ORIGIN } from './origins'
import type { RpcCall, RpcHandlers, RpcReply } from './rpc-types'

export {
  rpcError,
  type RpcCall,
  type RpcHandler,
  type RpcHandlers,
  type RpcReply,
} from './rpc-types'

export async function mockRpc(page: Page, overrides: RpcHandlers = {}, calls: RpcCall[] = []) {
  const handlers = { ...defaultHandlers(), ...overrides }
  await page.route(`${API_URL}/rpc/**`, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname.slice('/rpc/'.length).replaceAll('/', '.')
    const handler = handlers[path]
    if (!handler) {
      await route.fulfill({ status: 404, contentType: 'application/json', body: '{}' })
      return
    }
    const call: RpcCall = { path, input: await readInput(request), headers: request.headers() }
    calls.push(call)
    await fulfillRpc(route, await handler(call))
  })
}

async function readInput(request: Request): Promise<unknown> {
  const text = request.postData()
  if (!text) return undefined
  const wire: unknown = JSON.parse(text)
  return typeof wire === 'object' && wire !== null && 'json' in wire ? wire.json : undefined
}

async function fulfillRpc(route: Route, reply: RpcReply) {
  await route.fulfill({
    status: reply.status ?? 200,
    contentType: 'application/json',
    headers: {
      'access-control-allow-origin': APP_ORIGIN,
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    },
    body: JSON.stringify({ json: reply.body }),
  })
}

export async function mockJobEvents(
  page: Page,
  jobId: string,
  respond: (attempt: { lastEventId: string | undefined; attempt: number }) => string,
) {
  let attempt = 0
  await page.route(`${API_URL}/jobs/${jobId}/events`, async (route) => {
    attempt += 1
    const lastEventId = route.request().headers()['last-event-id']
    await route.fulfill({
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'access-control-allow-origin': APP_ORIGIN,
        'access-control-allow-credentials': 'true',
      },
      body: respond({ lastEventId, attempt }),
    })
  })
}

export function sseFrame(id: number, type: string, data: unknown): string {
  return `id: ${id}\nevent: ${type}\ndata: ${JSON.stringify(data)}\n\n`
}

export async function mockEventStream(page: Page, jobId: string, lines: string[]) {
  await mockJobEvents(page, jobId, () => lines.join(''))
}
