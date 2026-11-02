import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../../platform/db/client'
import {
  GithubApiError,
  GithubTokenRejectedError,
  type GithubRest,
} from '../../platform/github/client'
import { createGithubService } from './github.service'

const restReturning = (handler: (path: string, token?: string) => unknown): GithubRest => ({
  request: vi.fn(async (path: string, _schema: unknown, options?: { token?: string }) =>
    handler(path, options?.token),
  ) as GithubRest['request'],
  download: vi.fn(async () => undefined),
})

const repository = {
  id: 1,
  name: 'shop',
  private: true,
  default_branch: 'main',
  owner: { login: 'acme' },
}

const credentials = { appId: '1', privateKey: 'unused', slug: 'replo-dev' }

describe('createGithubService without GitHub App credentials', () => {
  const rest = restReturning(() => undefined)
  const github = createGithubService({
    db: {} as Db,
    rest,
    app: undefined,
    userTokens: { githubAccessToken: async () => 'ghu_any' },
  })

  it('returns a null install URL', () => {
    expect(github.installUrl()).toBeNull()
  })

  it('lists no repositories', async () => {
    await expect(github.listRepos('user-1')).resolves.toEqual([])
  })

  it('does not mint an installation token', async () => {
    await expect(github.installationToken(99)).resolves.toBeUndefined()
    expect(rest.request).not.toHaveBeenCalled()
  })
})

describe('userCanAccess', () => {
  const serviceWith = (rest: GithubRest, token: string | undefined) =>
    createGithubService({
      db: {} as Db,
      rest,
      app: credentials,
      userTokens: { githubAccessToken: async () => token },
    })

  it('asks GitHub with the user token, never an installation token', async () => {
    const seen: { path: string; token?: string }[] = []
    const rest = restReturning((path, token) => {
      seen.push({ path, token })
      return repository
    })
    await expect(
      serviceWith(rest, 'ghu_user').userCanAccess('u1', { owner: 'acme', name: 'shop' }),
    ).resolves.toBe(true)
    expect(seen).toEqual([{ path: '/repos/acme/shop', token: 'ghu_user' }])
  })

  it('refuses without calling GitHub when the user has no stored token', async () => {
    const rest = restReturning(() => repository)
    await expect(
      serviceWith(rest, undefined).userCanAccess('u1', { owner: 'acme', name: 'shop' }),
    ).resolves.toBe(false)
    expect(rest.request).not.toHaveBeenCalled()
  })

  it('refuses when GitHub hides the repository from the user', async () => {
    const rest = restReturning(() => undefined)
    await expect(
      serviceWith(rest, 'ghu_user').userCanAccess('u1', { owner: 'acme', name: 'secret' }),
    ).resolves.toBe(false)
  })

  it('reports a rejected token so the user can relink', async () => {
    const rest = restReturning((path) => {
      throw new GithubApiError(401, path)
    })
    await expect(
      serviceWith(rest, 'ghu_user').userCanAccess('u1', { owner: 'acme', name: 'shop' }),
    ).rejects.toBeInstanceOf(GithubTokenRejectedError)
  })

  it('does not treat a 403 as proof the user lacks access', async () => {
    const rest = restReturning((path) => {
      throw new GithubApiError(403, path)
    })
    await expect(
      serviceWith(rest, 'ghu_user').userCanAccess('u1', { owner: 'acme', name: 'shop' }),
    ).rejects.toMatchObject({ name: 'GithubApiError', status: 403 })
  })

  it('lets transient upstream failures surface so the job can retry', async () => {
    const rest = restReturning((path) => {
      throw new GithubApiError(502, path)
    })
    await expect(
      serviceWith(rest, 'ghu_user').userCanAccess('u1', { owner: 'acme', name: 'shop' }),
    ).rejects.toBeInstanceOf(GithubApiError)
  })

  it('encodes owner and name into the request path', async () => {
    const seen: string[] = []
    const rest = restReturning((path) => {
      seen.push(path)
      return undefined
    })
    await serviceWith(rest, 'ghu_user').userCanAccess('u1', { owner: 'a/b', name: 'c d' })
    expect(seen).toEqual(['/repos/a%2Fb/c%20d'])
  })
})
