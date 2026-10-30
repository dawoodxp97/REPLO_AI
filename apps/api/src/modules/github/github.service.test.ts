import { describe, expect, it, vi } from 'vitest'
import type { Db } from '../../platform/db/client'
import type { GithubRest } from '../../platform/github/client'
import { createGithubService } from './github.service'

const rest: GithubRest = {
  request: vi.fn(async () => undefined),
  download: vi.fn(async () => undefined),
}

describe('createGithubService without GitHub App credentials', () => {
  const github = createGithubService({ db: {} as Db, rest, app: undefined })

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
