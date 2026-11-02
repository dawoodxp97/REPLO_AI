import { createHmac } from 'node:crypto'
import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { createLogger } from '../../platform/logger'
import type { App } from '../../platform/http'
import { registerGithubWebhook } from './github.webhook.route'
import type { GithubWebhookService } from './github.webhook.service'

const SECRET = 'whsec_test'
const body = JSON.stringify({ zen: 'keep it simple' })
const sign = (secret: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`

function buildApp(options: { secret: string | undefined } = { secret: SECRET }) {
  const handle = vi.fn(async () => 'processed' as const)
  const app = Fastify() as unknown as App
  const parsed = vi.fn()
  app.addHook('preParsing', async (_request, _reply, payload) => {
    parsed()
    return payload
  })
  registerGithubWebhook(app, {
    secret: options.secret,
    webhooks: { handle } as unknown as GithubWebhookService,
    log: createLogger({ level: 'silent' }),
  })
  return { app, handle, parsed }
}

const send = (app: App, headers: Record<string, string>) =>
  app.inject({
    method: 'POST',
    url: '/webhooks/github',
    headers: { 'content-type': 'application/json', ...headers },
    payload: body,
  })

const full = (signature: string) => ({
  'x-hub-signature-256': signature,
  'x-github-event': 'ping',
  'x-github-delivery': 'delivery-1',
})

describe('GitHub webhook route', () => {
  it('rejects a request without a signature before reading the body', async () => {
    const { app, handle, parsed } = buildApp()
    const response = await send(app, {
      'x-github-event': 'ping',
      'x-github-delivery': 'delivery-1',
    })
    expect(response.statusCode).toBe(401)
    expect(response.json()).toMatchObject({ error: 'INVALID_SIGNATURE' })
    expect(parsed).not.toHaveBeenCalled()
    expect(handle).not.toHaveBeenCalled()
    await app.close()
  })

  it('rejects a malformed signature before reading the body', async () => {
    const { app, parsed } = buildApp()
    const response = await send(app, full('sha256=not-hex'))
    expect(response.statusCode).toBe(401)
    expect(parsed).not.toHaveBeenCalled()
    await app.close()
  })

  it.each(['x-github-event', 'x-github-delivery'])(
    'rejects a request missing %s before reading the body',
    async (missing) => {
      const { app, parsed, handle } = buildApp()
      const headers: Record<string, string> = full(sign(SECRET))
      delete headers[missing]
      const response = await send(app, headers)
      expect(response.statusCode).toBe(400)
      expect(response.json()).toMatchObject({ error: 'MISSING_HEADERS' })
      expect(parsed).not.toHaveBeenCalled()
      expect(handle).not.toHaveBeenCalled()
      await app.close()
    },
  )

  it('refuses before reading the body when no secret is configured', async () => {
    const { app, parsed } = buildApp({ secret: undefined })
    const response = await send(app, full(sign(SECRET)))
    expect(response.statusCode).toBe(503)
    expect(parsed).not.toHaveBeenCalled()
    await app.close()
  })

  it('still verifies the signature against the body', async () => {
    const { app, handle } = buildApp()
    expect((await send(app, full(sign('whsec_attacker')))).statusCode).toBe(401)
    expect(handle).not.toHaveBeenCalled()
    expect((await send(app, full(sign(SECRET)))).statusCode).toBe(202)
    expect(handle).toHaveBeenCalledTimes(1)
    await app.close()
  })
})
