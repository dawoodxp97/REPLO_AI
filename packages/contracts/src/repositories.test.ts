import { describe, expect, it } from 'vitest'
import { DeleteAccountInput } from './me'
import { PreflightInput, RepositoryListInput, RepositoryPage } from './repositories'

const REPO_ID = '0190f6a2-7c1e-7d4a-8f3b-2a9c4e5d6f71'

describe('DeleteAccountInput', () => {
  it('requires the explicit DELETE confirmation', () => {
    expect(DeleteAccountInput.safeParse({ confirm: 'DELETE' }).success).toBe(true)
    expect(DeleteAccountInput.safeParse({ confirm: 'delete' }).success).toBe(false)
    expect(DeleteAccountInput.safeParse({}).success).toBe(false)
  })
})

describe('RepositoryListInput', () => {
  it('defaults the page size to 25', () => {
    expect(RepositoryListInput.parse({}).limit).toBe(25)
  })

  it('rejects a cursor that is not a UUID', () => {
    expect(RepositoryListInput.safeParse({ cursor: 'not-a-uuid' }).success).toBe(false)
    expect(RepositoryListInput.safeParse({ cursor: REPO_ID }).success).toBe(true)
  })

  it('caps the page size at 100', () => {
    expect(RepositoryListInput.safeParse({ limit: 101 }).success).toBe(false)
  })
})

describe('RepositoryPage', () => {
  it('accepts an item without a job and a null cursor', () => {
    const page = RepositoryPage.parse({
      items: [
        {
          repositoryId: REPO_ID,
          owner: 'acme',
          name: 'shopfront',
          isPrivate: true,
          defaultBranch: 'main',
          latestJob: null,
        },
      ],
      nextCursor: null,
    })
    expect(page.items[0]?.latestJob).toBeNull()
  })
})

describe('PreflightInput', () => {
  it('accepts an installation repo by GitHub id', () => {
    expect(
      PreflightInput.safeParse({ source: { kind: 'installation', githubRepoId: 42 } }).success,
    ).toBe(true)
  })

  it('rejects a public URL on a non-GitHub host', () => {
    expect(
      PreflightInput.safeParse({
        source: { kind: 'public_url', url: 'https://gitlab.com/acme/shopfront' },
      }).success,
    ).toBe(false)
  })
})
