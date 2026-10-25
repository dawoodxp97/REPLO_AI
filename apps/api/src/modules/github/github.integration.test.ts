import { createHmac, generateKeyPairSync, randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import Fastify from 'fastify'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TutorialContent, ValidationReport } from '@replo/contracts'
import { ANALYZER_VERSION } from '@replo/repo-analysis'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  generationJobs,
  githubInstallations,
  repoPushEvents,
  repoSnapshots,
  repositories,
  userRepositories,
  webhookDeliveries,
} from '../../platform/db/schema'
import { createLogger } from '../../platform/logger'
import { createJobHistory } from '../generation/job-history.service'
import { createJobService } from '../generation/jobs.service'
import { createNotificationsService } from '../notifications/notifications.service'
import { fixedProgress } from '../../test/domain'
import { createTutorialLibrary } from '../tutorials/library.service'
import { createTutorialManager } from '../tutorials/manager.service'
import { createTutorialPublisher, type TutorialPublisher } from '../tutorials/publisher.service'
import { createTutorialReader } from '../tutorials/reader.service'
import { identityRepo } from '../identity/identity.repo'
import { createRepositoryChanges } from '../repositories/changes.service'
import { createRepositoryLibrary, type RepositoryLibrary } from '../repositories/library.service'
import type { GithubRest } from '../../platform/github/client'
import type { JobQueue } from '../../platform/queue/job-queue'
import type { z } from 'zod'
import { createGithubService } from './github.service'
import { githubInstallationsRepo } from './github.repo'
import { createGithubWebhookService } from './github.webhook.service'
import { registerGithubWebhook } from './github.webhook.route'

const fakeGithub = (routes: Record<string, unknown>): GithubRest => ({
  request: (async (path: string, schema: z.ZodType) => {
    const body = routes[path]
    return body === undefined ? undefined : schema.parse(body)
  }) as GithubRest['request'],
  download: async () => undefined,
})

const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 })
const appCredentials = {
  appId: '1',
  privateKey: privateKey.export({ type: 'pkcs1', format: 'pem' }).toString(),
  slug: 'replo-dev',
}

const githubInstallation = (id: number, login = 'acme') => ({
  id,
  account: { login },
  suspended_at: null,
})

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

const WEBHOOK_SECRET = 'whsec_github_integration'
const SHA = 'c'.repeat(40)
const PUSHED_SHA = 'd'.repeat(40)
const CART_PATH = 'src/cart.ts'

const silentQueue: JobQueue = { send: async () => null }

const report: ValidationReport = {
  referenceValidity: 1,
  verifiedClaimRatio: 1,
  judgeScore: null,
  confidence: 1,
  fabricatedIdentifiers: 0,
  repairs: 0,
  draft: false,
  issues: [],
}

const generator = {
  pipeline: 'lite' as const,
  pipelineVersion: 1,
  analyzerVersion: ANALYZER_VERSION,
  models: {
    planner: 'claude-haiku-5-5',
    author: 'claude-haiku-5-5',
    summarizer: null,
    judge: null,
  },
  promptVersions: {},
  promptHashes: {},
  budgetMicros: 2_000_000,
  spentMicros: 0,
}

const cartTutorial = (title: string, name: string): TutorialContent => ({
  schemaVersion: 1,
  meta: {
    title,
    repo: { owner: 'acme', name, commitSha: SHA },
    audience: 'intermediate',
    objectives: ['Explain the cart'],
    prerequisites: [],
  },
  chapters: [
    {
      key: 'orientation',
      title: 'Orientation',
      summary: 'Where the cart lives',
      objectives: ['Locate the cart'],
      prerequisites: [],
      lessons: [
        {
          key: 'map',
          title: 'The map',
          minutes: 5,
          blocks: [
            {
              type: 'prose',
              kind: 'observed',
              md: 'Items live in memory.',
              evidence: [{ refId: 'r_cart' }],
            },
          ],
          quiz: [],
        },
      ],
    },
  ],
  sourceRefs: {
    r_cart: { path: CART_PATH, startLine: 1, endLine: 3, blobSha: 'b'.repeat(40) },
  },
  furtherReading: [],
  openQuestions: [],
})

const pushOf = (githubRepoId: number, branch: string, changed: string[]) => ({
  ref: `refs/heads/${branch}`,
  after: PUSHED_SHA,
  repository: { id: githubRepoId },
  commits: [{ added: [], removed: [], modified: changed }],
})

describe.skipIf(DATABASE_URL === '')('GitHub links and webhooks against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let repositoryLibrary: RepositoryLibrary
  let publisher: TutorialPublisher
  let library: ReturnType<typeof createTutorialLibrary>
  let webhooks: ReturnType<typeof createGithubWebhookService>
  let jobs: ReturnType<typeof createJobService>
  let history: ReturnType<typeof createJobHistory>

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 2 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(
      sql`truncate table "user", repositories, github_installations, webhook_deliveries restart identity cascade`,
    )
    jobs = createJobService({
      db,
      queue: silentQueue,
      indexing: { snapshotRef: async () => undefined },
      notifications: createNotificationsService(db),
    })
    history = createJobHistory(db)
    library = createTutorialLibrary({
      db,
      indexing: {
        readFile: async () => undefined,
        listFiles: async () => [],
        readText: async () => undefined,
        snapshotRef: async () => ({
          repositoryId: '',
          commitSha: SHA,
          status: 'ready',
          createdAt: new Date(0),
        }),
      },
      reader: createTutorialReader(db),
      learning: fixedProgress(null),
    })
    publisher = createTutorialPublisher(db)
    const manager = createTutorialManager({ db, library, productOrigin: 'https://replo.test' })
    repositoryLibrary = createRepositoryLibrary({ db, jobs: history, tutorials: manager })
    webhooks = createGithubWebhookService({ db, sink: createRepositoryChanges(manager) })
  })

  afterAll(async () => {
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedRepo = async (githubRepoId: number) => {
    const [row] = await db
      .insert(repositories)
      .values({
        githubRepoId,
        owner: 'acme',
        name: `shop-${githubRepoId}`,
        isPrivate: true,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    if (!row) throw new Error('repository seed failed')
    return row.id
  }

  const link = (userId: string, repositoryId: string, installationId: number) =>
    db.insert(userRepositories).values({ userId, repositoryId, installationId })

  const installation = (userId: string, githubInstallationId: number) =>
    githubInstallationsRepo(db).upsertForUser({
      githubInstallationId,
      userId,
      accountLogin: 'acme',
      suspendedAt: null,
    })

  const deliver = (event: string, payload: unknown, deliveryId = randomUUID()) =>
    webhooks.handle({ deliveryId, event, payload })

  it('lists only the caller’s own linked repositories', async () => {
    const owner = await seedUser()
    const other = await seedUser()
    const shared = await seedRepo(900_001)
    const second = await seedRepo(900_002)
    await installation(owner, 5_001)
    await link(owner, shared, 5_001)
    await link(owner, second, 5_001)
    await link(other, shared, 5_002)

    const mine = await repositoryLibrary.list(owner, { limit: 25 })
    const theirs = await repositoryLibrary.list(other, { limit: 25 })
    expect(mine.items.map((item) => item.repositoryId).sort()).toEqual([shared, second].sort())
    expect(theirs.items.map((item) => item.repositoryId)).toEqual([shared])
  })

  it('pages the library with a cursor, newest repository first', async () => {
    const owner = await seedUser()
    const ids = [await seedRepo(900_010), await seedRepo(900_011), await seedRepo(900_012)]
    await installation(owner, 5_010)
    for (const id of ids) await link(owner, id, 5_010)

    const firstPage = await repositoryLibrary.list(owner, { limit: 2 })
    expect(firstPage.items.map((item) => item.repositoryId)).toEqual([ids[2], ids[1]])
    expect(firstPage.nextCursor).toBe(ids[1])

    const secondPage = await repositoryLibrary.list(owner, {
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    })
    expect(secondPage.items.map((item) => item.repositoryId)).toEqual([ids[0]])
    expect(secondPage.nextCursor).toBeNull()
  })

  it('removing a repo from an installation revokes only that installation’s links', async () => {
    const owner = await seedUser()
    const repoId = await seedRepo(900_003)
    await installation(owner, 5_003)
    await link(owner, repoId, 5_003)

    expect(
      await deliver('installation_repositories', {
        action: 'removed',
        installation: { id: 5_003 },
        repositories_removed: [{ id: 900_003 }],
      }),
    ).toBe('processed')
    expect((await repositoryLibrary.list(owner, { limit: 25 })).items).toEqual([])
  })

  it('uninstalling marks the installation deleted and revokes its links', async () => {
    const owner = await seedUser()
    const repoId = await seedRepo(900_004)
    await installation(owner, 5_004)
    await link(owner, repoId, 5_004)

    expect(
      await deliver('installation', {
        action: 'deleted',
        installation: { id: 5_004, account: { login: 'acme' } },
      }),
    ).toBe('processed')
    const [row] = await db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.githubInstallationId, 5_004))
    expect(row?.deletedAt).toBeInstanceOf(Date)
    expect((await repositoryLibrary.list(owner, { limit: 25 })).items).toEqual([])
  })

  it('acknowledges a replayed delivery without a second effect', async () => {
    const deliveryId = randomUUID()
    const payload = { action: 'suspend', installation: { id: 5_005, account: { login: 'acme' } } }
    expect(await deliver('installation', payload, deliveryId)).toBe('processed')
    expect(await deliver('installation', payload, deliveryId)).toBe('duplicate')
    const rows = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId))
    expect(rows).toHaveLength(1)
  })

  it('rejects a payload that does not match the schema and records nothing', async () => {
    const deliveryId = randomUUID()
    expect(await deliver('installation', { action: 'deleted' }, deliveryId)).toBe('invalid')
    const rows = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId))
    expect(rows).toHaveLength(0)
  })

  it('deleting an account removes its installations and links', async () => {
    const owner = await seedUser()
    const repoId = await seedRepo(900_006)
    await installation(owner, 5_006)
    await link(owner, repoId, 5_006)

    await identityRepo(db).deleteUser(owner)
    const links = await db.select().from(userRepositories).where(eq(userRepositories.userId, owner))
    const installs = await db
      .select()
      .from(githubInstallations)
      .where(eq(githubInstallations.userId, owner))
    expect(links).toEqual([])
    expect(installs).toEqual([])
  })

  it('reports another user’s job as not found', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const repoId = await seedRepo(900_007)
    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({ repositoryId: repoId, commitSha: 'c'.repeat(40), analyzerVersion: 1 })
      .returning({ id: repoSnapshots.id })
    if (!snapshot) throw new Error('snapshot seed failed')
    const [job] = await db
      .insert(generationJobs)
      .values({
        userId: owner,
        snapshotId: snapshot.id,
        kind: 'generate',
        idempotencyKey: randomUUID(),
        models: {
          provider: 'openrouter',
          preset: 'balanced',
          pipeline: 'full',
          models: { planner: 'p', author: 'a', summarizer: null, judge: null },
          budgetMicros: 2_000_000,
        },
        budgetMicros: 2_000_000,
      })
      .returning({ id: generationJobs.id })
    if (!job) throw new Error('job seed failed')

    await expect(jobs.getOwnedJob(stranger, job.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect(await history.latestByRepository(stranger, [repoId])).toEqual(new Map())
    expect((await history.latestByRepository(owner, [repoId])).get(repoId)?.jobId).toBe(job.id)
  })

  describe('push events', () => {
    const pushedRows = (repositoryId: string) =>
      db.select().from(repoPushEvents).where(eq(repoPushEvents.repositoryId, repositoryId))

    const seedPublishedTutorial = async (owner: string, repoId: string, repoName: string) => {
      const [snapshot] = await db
        .insert(repoSnapshots)
        .values({ repositoryId: repoId, commitSha: SHA, analyzerVersion: ANALYZER_VERSION })
        .returning({ id: repoSnapshots.id })
      if (!snapshot) throw new Error('snapshot seed failed')
      const [job] = await db
        .insert(generationJobs)
        .values({
          userId: owner,
          snapshotId: snapshot.id,
          kind: 'generate',
          idempotencyKey: randomUUID(),
          models: {
            provider: 'anthropic',
            preset: 'budget',
            pipeline: 'lite',
            models: {
              planner: 'claude-haiku-5-5',
              author: 'claude-haiku-5-5',
              summarizer: null,
              judge: null,
            },
            budgetMicros: 2_000_000,
          },
          budgetMicros: 2_000_000,
        })
        .returning({ id: generationJobs.id })
      if (!job) throw new Error('job seed failed')
      await db.transaction((tx) =>
        publisher.publishVersion(tx, {
          userId: owner,
          repositoryId: repoId,
          snapshotId: snapshot.id,
          jobId: job.id,
          audience: 'intermediate',
          content: cartTutorial('Cart walk', repoName),
          report,
          generator,
        }),
      )
      return { owner: 'acme', repo: repoName, slug: repoName }
    }

    it('records a push to the default branch with its changed paths', async () => {
      const repoId = await seedRepo(900_030)
      expect(await deliver('push', pushOf(900_030, 'main', [CART_PATH, 'src/other.ts']))).toBe(
        'processed',
      )
      const rows = await pushedRows(repoId)
      expect(rows).toHaveLength(1)
      expect(rows[0]).toMatchObject({ commitSha: PUSHED_SHA, paths: [CART_PATH, 'src/other.ts'] })
    })

    it('marks a tutorial stale when a default-branch push touches a file it cites', async () => {
      const owner = await seedUser()
      const repoId = await seedRepo(900_032)
      await installation(owner, 5_032)
      await link(owner, repoId, 5_032)
      const lookup = await seedPublishedTutorial(owner, repoId, 'shop-900032')

      expect((await library.overview({ userId: owner }, lookup)).stale).toBe(false)
      expect(await deliver('push', pushOf(900_032, 'main', [CART_PATH]))).toBe('processed')
      expect((await library.overview({ userId: owner }, lookup)).stale).toBe(true)
    })

    it('records nothing for a push to another branch', async () => {
      const repoId = await seedRepo(900_033)
      expect(await deliver('push', pushOf(900_033, 'feature/cart', [CART_PATH]))).toBe('skipped')
      expect(await pushedRows(repoId)).toEqual([])
    })

    it('acknowledges a push to a repository Replo does not know without recording it', async () => {
      const before = await db.select().from(repoPushEvents)
      expect(await deliver('push', pushOf(999_034, 'main', [CART_PATH]))).toBe('skipped')
      expect(await db.select().from(repoPushEvents)).toHaveLength(before.length)
    })

    it('rejects a push whose signature does not match the raw body and records nothing', async () => {
      const repoId = await seedRepo(900_035)
      const app = Fastify({ loggerInstance: createLogger({ level: 'silent' }) })
      registerGithubWebhook(app, {
        secret: WEBHOOK_SECRET,
        webhooks,
        log: createLogger({ level: 'silent' }),
      })
      await app.ready()
      const body = JSON.stringify(pushOf(900_035, 'main', [CART_PATH]))
      const sign = (secret: string) =>
        `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`
      const send = (signature: string) =>
        app.inject({
          method: 'POST',
          url: '/webhooks/github',
          headers: {
            'content-type': 'application/json',
            'x-github-event': 'push',
            'x-github-delivery': randomUUID(),
            'x-hub-signature-256': signature,
          },
          payload: body,
        })

      expect((await send(sign('whsec_attacker'))).statusCode).toBe(401)
      expect(await pushedRows(repoId)).toEqual([])
      expect((await send(sign(WEBHOOK_SECRET))).statusCode).toBe(202)
      expect(await pushedRows(repoId)).toHaveLength(1)
      await app.close()
    })
  })

  describe('GitHub App account links', () => {
    it('links an installation that GitHub lists for the signed-in user', async () => {
      const owner = await seedUser()
      const github = createGithubService({
        db,
        rest: fakeGithub({
          '/user/installations?per_page=100&page=1': { installations: [githubInstallation(6_001)] },
        }),
        app: appCredentials,
      })
      expect(
        await github.linkInstallation({
          userId: owner,
          installationId: 6_001,
          userToken: 'ghu_owner',
        }),
      ).toBe('linked')
      expect((await github.activeInstallations(owner)).map((i) => i.githubInstallationId)).toEqual([
        6_001,
      ])
    })

    it('refuses an installation the user cannot see on GitHub', async () => {
      const stranger = await seedUser()
      const github = createGithubService({
        db,
        rest: fakeGithub({ '/user/installations?per_page=100&page=1': { installations: [] } }),
        app: appCredentials,
      })
      expect(
        await github.linkInstallation({
          userId: stranger,
          installationId: 6_002,
          userToken: 'ghu_stranger',
        }),
      ).toBe('not_accessible')
    })

    it('refuses an installation already linked to another Replo account', async () => {
      const first = await seedUser()
      const second = await seedUser()
      const github = createGithubService({
        db,
        rest: fakeGithub({
          '/user/installations?per_page=100&page=1': { installations: [githubInstallation(6_003)] },
        }),
        app: appCredentials,
      })
      await github.linkInstallation({
        userId: first,
        installationId: 6_003,
        userToken: 'ghu_first',
      })
      expect(
        await github.linkInstallation({
          userId: second,
          installationId: 6_003,
          userToken: 'ghu_second',
        }),
      ).toBe('owned_by_another_user')
    })

    it('lists repositories only from the caller’s own installations', async () => {
      const owner = await seedUser()
      const other = await seedUser()
      const repoPage = {
        repositories: [
          {
            id: 7_001,
            name: 'shop',
            private: true,
            default_branch: 'main',
            owner: { login: 'acme' },
          },
        ],
      }
      const github = createGithubService({
        db,
        rest: fakeGithub({
          '/app/installations/6004/access_tokens': { token: 'ghs_owner' },
          '/installation/repositories?per_page=100&page=1': repoPage,
        }),
        app: appCredentials,
      })
      await installation(owner, 6_004)
      await installation(other, 6_005)

      const repos = await github.listRepos(owner)
      expect(repos).toEqual([
        {
          githubRepoId: 7_001,
          owner: 'acme',
          name: 'shop',
          isPrivate: true,
          defaultBranch: 'main',
          installationId: 6_004,
        },
      ])
    })
  })
})
