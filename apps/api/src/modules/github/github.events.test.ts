import { describe, expect, it } from 'vitest'
import {
  changedPaths,
  EVENT_SCHEMAS,
  isHandledEvent,
  pushChange,
  repositoryChange,
  suspendedAt,
} from './github.events'

const repository = {
  id: 42,
  name: 'shop',
  private: true,
  default_branch: 'trunk',
  owner: { login: 'acme' },
  license: { spdx_id: 'MIT' },
}

describe('isHandledEvent', () => {
  it('handles the installation, repository and push events', () => {
    expect(isHandledEvent('installation')).toBe(true)
    expect(isHandledEvent('installation_repositories')).toBe(true)
    expect(isHandledEvent('repository')).toBe(true)
    expect(isHandledEvent('push')).toBe(true)
    expect(isHandledEvent('ping')).toBe(false)
  })
})

describe('pushChange', () => {
  const push = (commits: { added: string[]; removed: string[]; modified: string[] }[]) => ({
    ref: 'refs/heads/main',
    after: 'a'.repeat(40),
    repository: { id: 42 },
    commits,
  })

  it('takes the union of added, removed and modified paths across commits', () => {
    expect(
      pushChange(
        EVENT_SCHEMAS.push.parse(
          push([
            { added: ['src/a.ts'], removed: [], modified: ['src/b.ts'] },
            { added: [], removed: ['src/b.ts'], modified: ['src/c.ts', 'src/a.ts'] },
          ]),
        ),
      ),
    ).toEqual({
      kind: 'push',
      githubRepoId: 42,
      ref: 'refs/heads/main',
      commitSha: 'a'.repeat(40),
      paths: ['src/a.ts', 'src/b.ts', 'src/c.ts'],
    })
  })

  it('caps the changed paths at 5000', () => {
    const many = Array.from({ length: 6000 }, (_, index) => `src/file-${index}.ts`)
    expect(changedPaths([{ added: many, removed: [], modified: [] }])).toHaveLength(5000)
  })
})

describe('EVENT_SCHEMAS.push', () => {
  it('rejects a push whose head is not a commit SHA', () => {
    expect(
      EVENT_SCHEMAS.push.safeParse({
        ref: 'refs/heads/main',
        after: 'not-a-sha',
        repository: { id: 42 },
        commits: [],
      }).success,
    ).toBe(false)
  })
})

describe('repositoryChange', () => {
  it('turns a deleted repository into a deletion of its links', () => {
    expect(repositoryChange('deleted', repository)).toEqual({
      kind: 'repository_deleted',
      githubRepoId: 42,
    })
  })

  it('maps every other action to a metadata update', () => {
    expect(repositoryChange('privatized', repository)).toEqual({
      kind: 'repository_updated',
      repository: {
        githubRepoId: 42,
        owner: 'acme',
        name: 'shop',
        isPrivate: true,
        defaultBranch: 'trunk',
        license: 'MIT',
      },
    })
  })

  it('stores a missing license as null', () => {
    const change = repositoryChange('edited', { ...repository, license: null })
    expect(change).toMatchObject({ kind: 'repository_updated', repository: { license: null } })
  })
})

describe('suspendedAt', () => {
  it('converts GitHub’s timestamp and keeps an active installation null', () => {
    expect(suspendedAt({ suspended_at: '2026-10-22T09:00:00Z' })).toEqual(
      new Date('2026-10-22T09:00:00Z'),
    )
    expect(suspendedAt({ suspended_at: null })).toBeNull()
    expect(suspendedAt({})).toBeNull()
  })
})

describe('EVENT_SCHEMAS', () => {
  it('defaults repositories_removed to an empty list on an add', () => {
    const parsed = EVENT_SCHEMAS.installation_repositories.parse({
      action: 'added',
      installation: { id: 7 },
    })
    expect(parsed.repositories_removed).toEqual([])
  })

  it('rejects an installation event without an account login', () => {
    expect(
      EVENT_SCHEMAS.installation.safeParse({
        action: 'created',
        installation: { id: 7, account: {} },
      }).success,
    ).toBe(false)
  })
})
