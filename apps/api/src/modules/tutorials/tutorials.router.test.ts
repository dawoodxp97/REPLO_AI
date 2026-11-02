import { createRouterClient } from '@orpc/server'
import { describe, expect, it, vi } from 'vitest'
import type { RequestContext } from '../../context'
import { tutorialsRouter } from './tutorials.router'

const TUTORIAL_ID = '0198c7a0-0000-7000-8000-000000000001'

const clientWith = (report: ReturnType<typeof vi.fn>) =>
  createRouterClient(tutorialsRouter, {
    context: {
      user: { id: 'user-1', name: null, email: null, image: null },
      sessionId: 'session-1',
      setSessionToken: () => undefined,
      services: { tutorialManager: { report } } as unknown as RequestContext['services'],
      idempotencyKey: undefined,
      requestId: 'request-1',
    },
  })

describe('tutorials router report', () => {
  it('passes the share token through to the manager', async () => {
    const report = vi.fn(async () => undefined)
    const result = await clientWith(report).report({
      tutorialId: TUTORIAL_ID,
      reason: 'abuse',
      shareToken: 'tok',
    })
    expect(result).toEqual({ ok: true })
    expect(report).toHaveBeenCalledWith('user-1', TUTORIAL_ID, 'abuse', 'tok')
  })

  it('reports without a share token for owned or public tutorials', async () => {
    const report = vi.fn(async () => undefined)
    await clientWith(report).report({ tutorialId: TUTORIAL_ID, reason: 'spam' })
    expect(report).toHaveBeenCalledWith('user-1', TUTORIAL_ID, 'spam', undefined)
  })
})
