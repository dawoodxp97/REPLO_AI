import type { RepositorySource } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import type { z } from 'zod'
import type { GithubRequestOptions, GithubRest } from '../../platform/github/client'
import type { InstallationDirectory } from './repositories.ports'
import { createPreflight } from './preflight'

const SHA = 'a'.repeat(40)
const PUBLIC_URL = 'https://github.com/acme/shop'

const repo = (overrides: Record<string, unknown> = {}) => ({
  id: 42,
  name: 'shop',
  private: false,
  default_branch: 'main',
  owner: { login: 'acme' },
  license: { spdx_id: 'MIT' },
  ...overrides,
})

const tree = (
  entries: { path: string; size?: number; type?: 'blob' | 'tree' }[],
  truncated = false,
) => ({
  truncated,
  tree: entries.map((entry) => ({ type: 'blob', sha: 'b'.repeat(40), ...entry })),
})

const packageJson = (content: object) => ({
  content: Buffer.from(JSON.stringify(content)).toString('base64'),
  encoding: 'base64',
})

type Route = unknown | ((token: string | undefined) => unknown)

function fakeRest(routes: Record<string, Route>, seen: GithubRequestOptions[] = []): GithubRest {
  return {
    request: (async (path: string, schema: z.ZodType, options?: GithubRequestOptions) => {
      seen.push(options ?? {})
      const route = routes[path]
      const body = typeof route === 'function' ? route(options?.token) : route
      return body === undefined ? undefined : schema.parse(body)
    }) as GithubRest['request'],
    download: async () => undefined,
  }
}

const noInstallations: InstallationDirectory = {
  activeInstallations: async () => [],
  installationToken: async () => undefined,
}

const limits = { maxFiles: 5000, maxBytes: 50_000_000 }

const healthyRoutes = {
  [`/repos/acme/shop`]: repo(),
  [`/repos/acme/shop/commits/main`]: { sha: SHA },
  [`/repos/acme/shop/git/trees/${SHA}?recursive=1`]: tree([
    { path: 'package.json', size: 120 },
    { path: 'src/cart.ts', size: 400 },
    { path: 'src/cart.test.ts', size: 100 },
    { path: 'README.md', size: 50 },
  ]),
  [`/repos/acme/shop/git/blobs/${'b'.repeat(40)}`]: packageJson({
    dependencies: { next: '16.0.0' },
  }),
}

describe('preflight', () => {
  it('summarises a public repo from the Git Trees API without any LLM or download', async () => {
    const preflight = createPreflight({
      rest: fakeRest(healthyRoutes),
      installations: noInstallations,
      limits,
    })
    const outcome = await preflight.run('user-1', { kind: 'public_url', url: PUBLIC_URL })
    expect(outcome).toEqual({
      kind: 'ok',
      value: {
        repo: {
          owner: 'acme',
          name: 'shop',
          isPrivate: false,
          defaultBranch: 'main',
          license: 'MIT',
        },
        commitSha: SHA,
        stats: {
          fileCount: 4,
          sourceFileCount: 1,
          totalBytes: 670,
          languages: { typescript: 2, markdown: 1, json: 1 },
          framework: 'Next.js',
        },
      },
    })
  })

  it('uses a commit SHA given as the ref without resolving it', async () => {
    const routes = { ...healthyRoutes }
    const preflight = createPreflight({
      rest: fakeRest(routes),
      installations: noInstallations,
      limits,
    })
    const outcome = await preflight.run('user-1', { kind: 'public_url', url: PUBLIC_URL, ref: SHA })
    expect(outcome.kind).toBe('ok')
  })

  it('refuses a repo the caller cannot see as not accessible', async () => {
    const preflight = createPreflight({
      rest: fakeRest({}),
      installations: noInstallations,
      limits,
    })
    expect(await preflight.run('user-1', { kind: 'public_url', url: PUBLIC_URL })).toEqual({
      kind: 'refused',
      refusal: { code: 'REPO_NOT_ACCESSIBLE' },
    })
  })

  it('refuses a truncated tree as too large', async () => {
    const routes = {
      ...healthyRoutes,
      [`/repos/acme/shop/git/trees/${SHA}?recursive=1`]: tree([{ path: 'a.ts' }], true),
    }
    const preflight = createPreflight({
      rest: fakeRest(routes),
      installations: noInstallations,
      limits,
    })
    expect(await preflight.run('user-1', { kind: 'public_url', url: PUBLIC_URL })).toEqual({
      kind: 'refused',
      refusal: { code: 'REPO_TOO_LARGE', data: { metric: 'files', value: 1, limit: 5000 } },
    })
  })

  it('refuses when included files exceed the file cap', async () => {
    const routes = {
      ...healthyRoutes,
      [`/repos/acme/shop/git/trees/${SHA}?recursive=1`]: tree([
        { path: 'a.ts' },
        { path: 'b.ts' },
        { path: 'c.ts' },
      ]),
    }
    const preflight = createPreflight({
      rest: fakeRest(routes),
      installations: noInstallations,
      limits: { maxFiles: 2, maxBytes: 1_000 },
    })
    expect(await preflight.run('user-1', { kind: 'public_url', url: PUBLIC_URL })).toEqual({
      kind: 'refused',
      refusal: { code: 'REPO_TOO_LARGE', data: { metric: 'files', value: 3, limit: 2 } },
    })
  })

  it('refuses when included bytes exceed the byte cap', async () => {
    const routes = {
      ...healthyRoutes,
      [`/repos/acme/shop/git/trees/${SHA}?recursive=1`]: tree([
        { path: 'a.ts', size: 900 },
        { path: 'b.ts', size: 200 },
      ]),
    }
    const preflight = createPreflight({
      rest: fakeRest(routes),
      installations: noInstallations,
      limits: { maxFiles: 10, maxBytes: 1_000 },
    })
    expect(await preflight.run('user-1', { kind: 'public_url', url: PUBLIC_URL })).toEqual({
      kind: 'refused',
      refusal: { code: 'REPO_TOO_LARGE', data: { metric: 'bytes', value: 1100, limit: 1000 } },
    })
  })

  it('refuses a repo with no TypeScript or JavaScript source', async () => {
    const routes = {
      ...healthyRoutes,
      [`/repos/acme/shop/git/trees/${SHA}?recursive=1`]: tree([
        { path: 'main.py' },
        { path: 'README.md' },
      ]),
    }
    const preflight = createPreflight({
      rest: fakeRest(routes),
      installations: noInstallations,
      limits,
    })
    expect(await preflight.run('user-1', { kind: 'public_url', url: PUBLIC_URL })).toEqual({
      kind: 'refused',
      refusal: { code: 'UNSUPPORTED_LANGUAGE' },
    })
  })

  it('finds an installation repo by trying only the caller’s installations', async () => {
    const seen: GithubRequestOptions[] = []
    const installations: InstallationDirectory = {
      activeInstallations: async () => [{ githubInstallationId: 7 }, { githubInstallationId: 8 }],
      installationToken: async (id) => (id === 7 ? 'ghs_seven' : 'ghs_eight'),
    }
    const routes = {
      '/repositories/42': (token: string | undefined) =>
        token === 'ghs_eight' ? repo({ private: true }) : undefined,
      [`/repos/acme/shop/commits/main`]: { sha: SHA },
      [`/repos/acme/shop/git/trees/${SHA}?recursive=1`]: tree([{ path: 'src/a.ts', size: 10 }]),
    }
    const preflight = createPreflight({ rest: fakeRest(routes, seen), installations, limits })
    const outcome = await preflight.run('user-1', { kind: 'installation', githubRepoId: 42 })
    expect(outcome.kind).toBe('ok')
    expect(seen.map((o) => o.token)).toContain('ghs_eight')
  })

  it('reports not accessible when no installation of the caller can see the repo', async () => {
    const installations: InstallationDirectory = {
      activeInstallations: async () => [{ githubInstallationId: 7 }],
      installationToken: async () => 'ghs_seven',
    }
    const preflight = createPreflight({ rest: fakeRest({}), installations, limits })
    const source: RepositorySource = { kind: 'installation', githubRepoId: 42 }
    expect(await preflight.run('user-1', source)).toEqual({
      kind: 'refused',
      refusal: { code: 'REPO_NOT_ACCESSIBLE' },
    })
  })
})
