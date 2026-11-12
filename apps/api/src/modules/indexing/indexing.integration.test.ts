import { mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { DEFAULT_EXTRACTION_LIMITS } from '@replo/repo-analysis'
import { createDb, type Db } from '../../platform/db/client'
import { repositories } from '../../platform/db/schema'
import {
  GithubApiError,
  GithubTokenRejectedError,
  type GithubRest,
} from '../../platform/github/client'
import { gzippedTarballOf } from '../../test/tarball'
import { JobError } from '../../worker/errors'
import { createIndexingService, type IngestSource } from './indexing.service'
import { snapshotsRepo } from './indexing.repo'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const SHA = 'a'.repeat(40)
const ROOT = 'acme-shop-aaaaaaa/'

const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

describe.skipIf(DATABASE_URL === '')('indexing against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let snapshotRoot: string
  let nextGithubRepoId = 1_000_000

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 6 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(sql`truncate table users, repositories restart identity cascade`)
    snapshotRoot = await mkdtemp(join(tmpdir(), 'replo-indexing-'))
  })

  afterAll(async () => {
    await rm(snapshotRoot, { recursive: true, force: true })
    await pool.end()
  })

  const seedSnapshot = async () => {
    nextGithubRepoId += 1
    const [repository] = await db
      .insert(repositories)
      .values({
        githubRepoId: nextGithubRepoId,
        owner: 'acme',
        name: `shop-${nextGithubRepoId}`,
        isPrivate: true,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    if (!repository) throw new Error('repository seed failed')
    return snapshotsRepo(db).ensure({ repositoryId: repository.id, commitSha: SHA })
  }

  const source: IngestSource = {
    owner: 'acme',
    name: 'shop',
    isPrivate: true,
    installationId: 5,
  }

  const serviceWith = (overrides: {
    rest?: GithubRest
    userCanAccess?: (userId: string) => Promise<boolean>
    installationToken?: (installationId: number) => Promise<string | undefined>
  }) =>
    createIndexingService({
      db,
      rest: overrides.rest ?? { request: async () => undefined, download: async () => undefined },
      tokens: {
        installationToken: overrides.installationToken ?? (async () => 'ghs_installation'),
        userCanAccess: overrides.userCanAccess ?? (async () => true),
      },
      sources: { ingestSource: async () => source },
      limits: { maxFiles: 5000, maxBytes: 50_000_000 },
      extraction: DEFAULT_EXTRACTION_LIMITS,
      snapshotRoot,
    })

  const tarballRest = (delayMs = 0): GithubRest => ({
    request: async () => undefined,
    download: async () => {
      await pause(delayMs)
      const body = await gzippedTarballOf([
        { name: ROOT, type: 'directory' },
        { name: `${ROOT}src/`, type: 'directory' },
        { name: `${ROOT}src/cart.ts`, body: 'export const cart = 1\n' },
        { name: `${ROOT}src/index.ts`, body: "import './cart'\n" },
        { name: `${ROOT}package.json`, body: '{"name":"shop"}' },
      ])
      return new Response(body)
    },
  })

  it('refuses to ingest with the installation token when the user cannot access the repository', async () => {
    const snapshotId = await seedSnapshot()
    const installationToken = vi.fn(async () => 'ghs_installation')
    const download = vi.fn(async () => undefined)
    const indexing = serviceWith({
      rest: { request: async () => undefined, download },
      userCanAccess: async () => false,
      installationToken,
    })

    const failure = await indexing
      .ingest({ userId: 'u1', snapshotId, signal: new AbortController().signal })
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(JobError)
    expect(failure).toMatchObject({ code: 'REPO_NOT_ACCESSIBLE', retryable: false })
    expect(installationToken).not.toHaveBeenCalled()
    expect(download).not.toHaveBeenCalled()
  })

  it('refuses a user who cannot access the repository even when the snapshot is already materialized', async () => {
    const snapshotId = await seedSnapshot()
    const signal = new AbortController().signal
    await serviceWith({ rest: tarballRest() }).ingest({ userId: 'owner', snapshotId, signal })

    const failure = await serviceWith({ userCanAccess: async (userId) => userId === 'owner' })
      .ingest({ userId: 'outsider', snapshotId, signal })
      .catch((error: unknown) => error)

    expect(failure).toBeInstanceOf(JobError)
    expect(failure).toMatchObject({ code: 'REPO_NOT_ACCESSIBLE', retryable: false })
  })

  it('checks access for the user who owns the job', async () => {
    const snapshotId = await seedSnapshot()
    const asked: string[] = []
    const indexing = serviceWith({
      rest: tarballRest(),
      userCanAccess: async (userId) => {
        asked.push(userId)
        return true
      },
    })
    await indexing.ingest({ userId: 'user-42', snapshotId, signal: new AbortController().signal })
    expect(asked).toEqual(['user-42'])
  })

  it('materializes a snapshot once even when several jobs ingest it at the same time', async () => {
    const snapshotId = await seedSnapshot()
    const indexing = serviceWith({ rest: tarballRest(10) })
    const signal = new AbortController().signal

    await Promise.all([
      indexing.ingest({ userId: 'u1', snapshotId, signal }),
      indexing.ingest({ userId: 'u2', snapshotId, signal }),
      indexing.ingest({ userId: 'u3', snapshotId, signal }),
    ])

    expect(await indexing.readText(snapshotId, 'src/cart.ts')).toBe('export const cart = 1\n')
    expect(await indexing.readText(snapshotId, 'package.json')).toBe('{"name":"shop"}')
    expect((await indexing.listFiles(snapshotId)).map((file) => file.path).sort()).toEqual([
      'package.json',
      'src/cart.ts',
      'src/index.ts',
    ])
    expect((await snapshotsRepo(db).findById(snapshotId))?.status).toBe('ready')
    expect((await readdir(snapshotRoot)).filter((entry) => entry.endsWith('.tmp'))).toEqual([])
  })

  it('indexes a snapshot that two jobs index at the same time', async () => {
    const snapshotId = await seedSnapshot()
    const indexing = serviceWith({ rest: tarballRest(10) })
    const signal = new AbortController().signal

    await Promise.all([
      indexing.index({ userId: 'u1', snapshotId, signal }),
      indexing.index({ userId: 'u2', snapshotId, signal }),
    ])

    const view = await indexing.readView(snapshotId)
    expect(view?.analysis).not.toBeNull()
    expect(view?.files.map((file) => file.path).sort()).toEqual([
      'package.json',
      'src/cart.ts',
      'src/index.ts',
    ])
  })

  it('asks the user to relink when GitHub rejects the stored token', async () => {
    const snapshotId = await seedSnapshot()
    const indexing = serviceWith({
      userCanAccess: async () => {
        throw new GithubTokenRejectedError()
      },
    })
    const failure = await indexing
      .ingest({ userId: 'u1', snapshotId, signal: new AbortController().signal })
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(JobError)
    expect(failure).toMatchObject({ code: 'GITHUB_RELINK_REQUIRED', retryable: false })
  })

  it('retries when GitHub answers 403 instead of failing the job for good', async () => {
    const snapshotId = await seedSnapshot()
    const indexing = serviceWith({
      userCanAccess: async () => {
        throw new GithubApiError(403, '/repos/acme/shop')
      },
    })
    const failure = await indexing
      .ingest({ userId: 'u1', snapshotId, signal: new AbortController().signal })
      .catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(JobError)
    expect(failure).toMatchObject({ code: 'GITHUB_FORBIDDEN', retryable: true })
  })

  it('replaces a half-extracted directory left behind for a snapshot that is not ready', async () => {
    const snapshotId = await seedSnapshot()
    const partial = join(snapshotRoot, snapshotId)
    await mkdir(join(partial, 'src'), { recursive: true })
    await writeFile(join(partial, 'src', 'index.ts'), 'partial')

    const indexing = serviceWith({ rest: tarballRest() })
    await indexing.ingest({ userId: 'u1', snapshotId, signal: new AbortController().signal })

    expect(await indexing.readText(snapshotId, 'src/cart.ts')).toBe('export const cart = 1\n')
    expect(await indexing.readText(snapshotId, 'src/index.ts')).toBe("import './cart'\n")
    expect((await readdir(snapshotRoot)).filter((entry) => /\.(tmp|old)$/.test(entry))).toEqual([])
  })
})
