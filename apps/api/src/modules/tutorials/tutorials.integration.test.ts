import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TutorialContent, ValidationReport } from '@replo/contracts'
import { ANALYZER_VERSION } from '@replo/repo-analysis'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { generationJobs, repositories, repoSnapshots } from '../../platform/db/schema'
import type { IndexingService } from '../indexing/indexing.service'
import { fixedProgress } from '../../test/domain'
import { createTutorialLibrary, type TutorialLibrary } from './library.service'
import { createTutorialManager, type TutorialManager } from './manager.service'
import { createTutorialPublisher, type TutorialPublisher } from './publisher.service'
import { createTutorialReader } from './reader.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const SHA = 'c'.repeat(40)
const BLOB = 'b'.repeat(40)

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

const contentOf = (title: string, name: string): TutorialContent => ({
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
          quiz: [
            {
              key: 'memory',
              kind: 'true_false',
              prompt: 'The cart is stored in memory.',
              options: [
                { key: 'true', text: 'True' },
                { key: 'false', text: 'False' },
              ],
              correct: 'true',
              explanation: 'The cart array is module state.',
              evidence: [{ refId: 'r_cart' }],
            },
          ],
        },
      ],
    },
  ],
  sourceRefs: {
    r_cart: { path: 'src/cart.ts', startLine: 1, endLine: 3, blobSha: BLOB },
  },
  furtherReading: [],
  openQuestions: [],
})

const CART_TEXT =
  'export const cart: string[] = []\nexport function add(item: string) {\n  cart.push(item)\n}\n'

describe.skipIf(DATABASE_URL === '')('tutorial library against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let publisher: TutorialPublisher
  let library: TutorialLibrary
  let manager: TutorialManager
  const TREE_FILES = [
    {
      path: 'public/logo.png',
      blobSha: BLOB,
      language: null,
      role: 'asset' as const,
      sizeBytes: 2048,
    },
    {
      path: 'src/big.ts',
      blobSha: BLOB,
      language: 'typescript' as const,
      role: 'source' as const,
      sizeBytes: 2_000_000,
    },
    {
      path: 'src/cart.ts',
      blobSha: BLOB,
      language: 'typescript' as const,
      role: 'source' as const,
      sizeBytes: CART_TEXT.length,
    },
  ]
  const indexing: Pick<IndexingService, 'listFiles' | 'readFile' | 'readText' | 'snapshotRef'> = {
    listFiles: async () => TREE_FILES,
    readFile: async (_snapshotId, path) =>
      path === 'src/cart.ts'
        ? {
            path,
            blobSha: BLOB,
            language: 'typescript',
            role: 'source',
            sizeBytes: CART_TEXT.length,
          }
        : undefined,
    readText: async (_snapshotId, path) => (path === 'src/cart.ts' ? CART_TEXT : undefined),
    snapshotRef: async () => ({
      repositoryId: '',
      commitSha: SHA,
      status: 'ready',
      createdAt: new Date(0),
    }),
  }

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(sql`truncate table "user", repositories restart identity cascade`)
    library = createTutorialLibrary({
      db,
      indexing,
      reader: createTutorialReader(db),
      learning: fixedProgress(0.5),
    })
    publisher = createTutorialPublisher(db)
    manager = createTutorialManager({ db, library, productOrigin: 'https://replo.test' })
  })

  afterAll(async () => {
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedRepo = async (license: string | null) => {
    const name = `shop${randomUUID().slice(0, 8)}`
    const [repo] = await db
      .insert(repositories)
      .values({
        githubRepoId: Math.floor(Math.random() * 1_000_000_000) + 1,
        owner: 'acme',
        name,
        isPrivate: false,
        defaultBranch: 'main',
        license,
      })
      .returning({ id: repositories.id })
    if (!repo) throw new Error('repository seed failed')
    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({
        repositoryId: repo.id,
        commitSha: SHA,
        analyzerVersion: ANALYZER_VERSION,
        status: 'ready',
        analysis: {
          analyzerVersion: ANALYZER_VERSION,
          framework: null,
          entryPoints: [],
          routes: [],
          metrics: {},
          unresolvedImports: 0,
          parseErrors: [],
        },
      })
      .returning({ id: repoSnapshots.id })
    if (!snapshot) throw new Error('snapshot seed failed')
    return { repositoryId: repo.id, snapshotId: snapshot.id, name }
  }

  type Seed = Awaited<ReturnType<typeof seedRepo>>

  const seedJob = async (userId: string, snapshotId: string) => {
    const [job] = await db
      .insert(generationJobs)
      .values({
        userId,
        snapshotId,
        kind: 'generate',
        status: 'succeeded',
        audience: 'intermediate',
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
    return job.id
  }

  const publish = async (userId: string, seed: Seed, title: string) => {
    const jobId = await seedJob(userId, seed.snapshotId)
    return db.transaction((tx) =>
      publisher.publishVersion(tx, {
        userId,
        repositoryId: seed.repositoryId,
        snapshotId: seed.snapshotId,
        jobId,
        audience: 'intermediate',
        content: contentOf(title, seed.name),
        report,
        generator,
      }),
    )
  }

  const lookup = (seed: Seed) => ({ owner: 'acme', repo: seed.name, slug: seed.name })

  it('publishes a new version of an existing tutorial and keeps the slug', async () => {
    const owner = await seedUser()
    const seed = await seedRepo('MIT')
    const first = await publish(owner, seed, 'First draft')
    const second = await publish(owner, seed, 'Second draft')

    expect(second.tutorialId).toBe(first.tutorialId)
    expect(second.versionNo).toBe(first.versionNo + 1)
    const overview = await library.overview({ userId: owner }, lookup(seed))
    expect(overview.tutorial.title).toBe('Second draft')
    expect(overview.newerVersionAvailable).toBe(false)
  })

  it('hides a private tutorial from other users and from anonymous readers', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo('MIT')
    await publish(owner, seed, 'Private walk')

    await expect(library.overview({ userId: stranger }, lookup(seed))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(library.overview({}, lookup(seed))).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('serves a link-shared tutorial only with the right token', async () => {
    const owner = await seedUser()
    const seed = await seedRepo('MIT')
    const version = await publish(owner, seed, 'Shared walk')

    const { token, url } = await manager.createShareLink(owner, version.tutorialId)
    expect(url).toContain(`?share=${token}`)

    const viaLink = await library.overview({}, { ...lookup(seed), shareToken: token })
    expect(viaLink.versionId).toBe(version.versionId)
    await expect(
      library.overview({}, { ...lookup(seed), shareToken: 'wrong' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('refuses public visibility for a repository without an open licence', async () => {
    const owner = await seedUser()
    const seed = await seedRepo(null)
    const version = await publish(owner, seed, 'Closed licence')

    const outcome = await manager.setVisibility(owner, {
      tutorialId: version.tutorialId,
      visibility: 'public',
    })
    expect(outcome).toEqual({
      kind: 'refused',
      refusal: { code: 'PUBLIC_REQUIRES_OPEN_LICENSE' },
    })
  })

  it('removes the learner-only answer key from chapters', async () => {
    const owner = await seedUser()
    const seed = await seedRepo('MIT')
    const version = await publish(owner, seed, 'Learner view')

    const chapter = await library.chapter(
      { userId: owner },
      { versionId: version.versionId, chapterKey: 'orientation' },
    )
    const [question] = chapter.chapter.lessons[0]?.quiz ?? []
    expect(question).toBeDefined()
    expect(question).not.toHaveProperty('correct')
    expect(question).not.toHaveProperty('explanation')
    expect(Object.keys(chapter.sourceRefs)).toEqual(['r_cart'])
  })

  it('returns source text with a commit-pinned permalink and refuses unknown files', async () => {
    const owner = await seedUser()
    const seed = await seedRepo('MIT')
    const version = await publish(owner, seed, 'Source walk')

    const file = await library.source(
      { userId: owner },
      { versionId: version.versionId, path: 'src/cart.ts' },
    )
    expect(file.content).toBe(CART_TEXT)
    expect(file.permalink).toBe(`https://github.com/acme/${seed.name}/blob/${SHA}/src/cart.ts`)
    await expect(
      library.source({ userId: owner }, { versionId: version.versionId, path: 'src/missing.ts' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('lists every recorded file with its size, role and whether its text can be read', async () => {
    const owner = await seedUser()
    const seed = await seedRepo('MIT')
    const version = await publish(owner, seed, 'Tree walk')

    const tree = await library.sourceTree({ userId: owner }, { versionId: version.versionId })

    expect(tree.commitSha).toBe(SHA)
    expect(tree.files.map((file) => file.path)).toEqual([
      'public/logo.png',
      'src/big.ts',
      'src/cart.ts',
    ])
    expect(tree.files.find((file) => file.path === 'src/cart.ts')).toMatchObject({
      readable: true,
      role: 'source',
    })
    expect(tree.files.find((file) => file.path === 'src/big.ts')).toMatchObject({ readable: false })
    expect(tree.files.find((file) => file.path === 'public/logo.png')).toMatchObject({
      readable: false,
      role: 'asset',
    })
  })

  it('refuses the file tree of a private tutorial to another user', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo('MIT')
    const version = await publish(owner, seed, 'Private tree')

    await expect(
      library.sourceTree({ userId: stranger }, { versionId: version.versionId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('marks a tutorial stale when a push touches a file it cites', async () => {
    const owner = await seedUser()
    const seed = await seedRepo('MIT')
    await publish(owner, seed, 'Stale walk')
    const before = await library.overview({ userId: owner }, lookup(seed))
    expect(before.stale).toBe(false)

    await db.transaction((tx) =>
      manager.recordPush(tx, {
        repositoryId: seed.repositoryId,
        commitSha: 'd'.repeat(40),
        paths: ['src/cart.ts'],
        pushedAt: new Date(Date.now() + 60_000),
      }),
    )
    const after = await library.overview({ userId: owner }, lookup(seed))
    expect(after.stale).toBe(true)
  })

  it('reports a public tutorial and rejects reports for private ones', async () => {
    const owner = await seedUser()
    const reporter = await seedUser()
    const seed = await seedRepo('MIT')
    const version = await publish(owner, seed, 'Report me')

    await expect(manager.report(reporter, version.tutorialId, 'copyright')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await manager.setVisibility(owner, { tutorialId: version.tutorialId, visibility: 'public' })
    await expect(manager.report(reporter, version.tutorialId, 'copyright')).resolves.toBeUndefined()
  })

  it('does not let another user change visibility or create a share link', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo('MIT')
    const version = await publish(owner, seed, 'Guarded walk')

    await expect(
      manager.setVisibility(stranger, { tutorialId: version.tutorialId, visibility: 'link' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(manager.createShareLink(stranger, version.tutorialId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    const unchanged = await library.overview({ userId: owner }, lookup(seed))
    expect(unchanged.tutorial.visibility).toBe('private')
  })

  it('deletes only the owner’s tutorial and returns NOT_FOUND to anyone else', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo('MIT')
    await publish(owner, seed, 'Delete me')
    const { items } = await library.list(owner, { limit: 25 })
    const target = items.find((item) => item.title === 'Delete me')
    expect(target).toBeDefined()
    if (!target) return

    await expect(manager.deleteTutorial(stranger, target.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await manager.deleteTutorial(owner, target.id)
    const after = await library.list(owner, { limit: 25 })
    expect(after.items.map((item) => item.id)).not.toContain(target.id)
  })

  it('counts tutorials by visibility and searches only the caller’s titles', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo('MIT')
    await publish(owner, seed, 'Searchable cart tour')
    await publish(stranger, seed, 'Searchable cart tour')

    const counts = await library.counts(owner)
    expect(counts.total).toBe(1)
    expect(counts.private).toBe(1)

    const found = await library.searchOwn(owner, 'cart tour', 10)
    expect(found.tutorials.map((item) => item.title)).toEqual(['Searchable cart tour'])
    expect(found.lessons).toEqual([])

    const lessons = await library.searchOwn(owner, 'map', 10)
    expect(lessons.lessons.map((item) => item.lessonKey)).toEqual(['map'])
    expect(lessons.tutorials).toEqual([])
  })

  it('lists recent publications in the caller’s time zone', async () => {
    const owner = await seedUser()
    const seed = await seedRepo('MIT')
    await publish(owner, seed, 'Recent walk')

    const items = await library.recentPublished(owner, {
      zone: 'Asia/Karachi',
      limit: 10,
      offset: 0,
    })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'tutorial_published',
      link: `/tutorials/acme/${seed.name}/${seed.name}`,
    })
    expect(items[0]?.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('anonymises public tutorials when the owner leaves and deletes the private ones', async () => {
    const owner = await seedUser()
    const publicSeed = await seedRepo('MIT')
    const privateSeed = await seedRepo('MIT')
    const kept = await publish(owner, publicSeed, 'Left behind')
    await publish(owner, privateSeed, 'Private leftover')
    await manager.setVisibility(owner, { tutorialId: kept.tutorialId, visibility: 'public' })

    await db.transaction((tx) => manager.settleOwnerDeletion(tx, owner, 'anonymise'))

    const remaining = await db.execute(
      sql`select title, user_id from tutorials where id = ${kept.tutorialId}`,
    )
    expect(remaining.rows).toEqual([{ title: 'Left behind', user_id: null }])
    const orphanedPrivate = await db.execute(
      sql`select count(*)::int as total from tutorials where user_id = ${owner}`,
    )
    expect(orphanedPrivate.rows[0]).toEqual({ total: 0 })
  })
})
