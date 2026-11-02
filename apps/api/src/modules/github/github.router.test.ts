import { createRouterClient } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import type { RequestContext } from '../../context'
import { githubRouter } from './github.router'
import { GithubTokenRejectedError, type GithubService } from './github.service'

const clientWith = (listRepos: GithubService['listRepos']) =>
  createRouterClient(githubRouter, {
    context: {
      user: { id: 'user-1', name: null, email: null, image: null },
      sessionId: 'session-1',
      setSessionToken: () => undefined,
      services: { github: { listRepos } } as unknown as RequestContext['services'],
      idempotencyKey: undefined,
      requestId: 'request-1',
    },
  })

describe('github router', () => {
  it('tells the product to re-link GitHub when the stored user token was rejected', async () => {
    const client = clientWith(async () => {
      throw new GithubTokenRejectedError()
    })
    await expect(client.listRepos()).rejects.toMatchObject({ code: 'GITHUB_RELINK_REQUIRED' })
  })

  it('does not disguise other failures as a re-link prompt', async () => {
    const client = clientWith(async () => {
      throw new TypeError('boom')
    })
    await expect(client.listRepos()).rejects.not.toMatchObject({ code: 'GITHUB_RELINK_REQUIRED' })
  })

  it('returns the repositories when listing succeeds', async () => {
    const client = clientWith(async () => [])
    await expect(client.listRepos()).resolves.toEqual([])
  })
})
