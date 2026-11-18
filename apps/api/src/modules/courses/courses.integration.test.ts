import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { applyDdl } from '../../platform/db/test-setup'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { CourseContent, ValidationReport } from '@replo/contracts'
import { ANALYZER_VERSION } from '@replo/repo-analysis'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  generationJobs,
  repositories,
  repositorySnapshots,
  courses,
  courseVersions,
  courseLessons,
} from '../../platform/db/schema'
import type { IndexingService } from '../indexing/indexing.service'
import { fixedProgress } from '../../test/domain'
import { createCourseCatalog, type CourseCatalog } from './catalog.service'
import { createCourseContent, type CourseContentService } from './content.service'
import { createCourseManager, type CourseManager } from './manager.service'
import { createCoursePublisher, type CoursePublisher } from './publisher.service'
import { slugify } from './publish-rows'
import { createVersionAccess } from './version-access.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const SHA = 'c'.repeat(40)
const BLOB = 'b'.repeat(40)

const report: ValidationReport = {
  referenceValidity: 1,
  verifiedClaimRatio: 1,
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
  },
  promptVersions: {},
  promptHashes: {},
}

const contentOf = (title: string, name: string): CourseContent => ({
  schemaVersion: 2,
  graph: { nodes: [], edges: [] },
  tours: [],
  diagrams: [],
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

describe.skipIf(DATABASE_URL === '')('course library against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let publisher: CoursePublisher
  let catalog: CourseCatalog
  let content: CourseContentService
  let manager: CourseManager
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
    await applyDdl(pool)
    await db.execute(sql`truncate table users, repositories restart identity cascade`)
    catalog = createCourseCatalog({ db, learning: fixedProgress(0.5) })
    content = createCourseContent({
      db,
      indexing,
      versionAccess: createVersionAccess(db),
      learning: fixedProgress(0.5),
    })
    publisher = createCoursePublisher(db)
    manager = createCourseManager({ db })
  })

  afterAll(async () => {
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(users).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedRepo = async () => {
    const name = `shop${randomUUID().slice(0, 8)}`
    const [repo] = await db
      .insert(repositories)
      .values({
        githubRepoId: Math.floor(Math.random() * 1_000_000_000) + 1,
        owner: 'acme',
        name,
        isPrivate: false,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    if (!repo) throw new Error('repository seed failed')
    const [snapshot] = await db
      .insert(repositorySnapshots)
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
      .returning({ id: repositorySnapshots.id })
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
        status: 'succeeded',
        audience: 'intermediate',
        idempotencyKey: randomUUID(),
        models: {
          provider: 'anthropic',
          pipeline: 'lite',
          models: {
            planner: 'claude-haiku-5-5',
            author: 'claude-haiku-5-5',
            summarizer: null,
          },
        },
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

  const publishFor = (userId: string, seed: Seed, jobId: string, title: string) =>
    db.transaction((tx) =>
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

  const lookup = (seed: Seed) => ({ owner: 'acme', repo: seed.name, slug: seed.name })

  it('publishes a new version of an existing course and keeps the slug', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const first = await publish(owner, seed, 'First draft')
    const second = await publish(owner, seed, 'Second draft')

    expect(second.courseId).toBe(first.courseId)
    expect(second.versionNo).toBe(first.versionNo + 1)
    const overview = await content.overview({ userId: owner }, lookup(seed))
    expect(overview.course.title).toBe('Second draft')
    expect(overview.newerVersionAvailable).toBe(false)
  })

  it('hides a private course from other users and from anonymous readers', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo()
    await publish(owner, seed, 'Private walk')

    await expect(content.overview({ userId: stranger }, lookup(seed))).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(content.overview({}, lookup(seed))).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('removes the learner-only answer key from chapters', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const version = await publish(owner, seed, 'Learner view')

    const chapter = await content.chapter(
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
    const seed = await seedRepo()
    const version = await publish(owner, seed, 'Source walk')

    const file = await content.source(
      { userId: owner },
      { versionId: version.versionId, path: 'src/cart.ts' },
    )
    expect(file.content).toBe(CART_TEXT)
    expect(file.permalink).toBe(`https://github.com/acme/${seed.name}/blob/${SHA}/src/cart.ts`)
    await expect(
      content.source({ userId: owner }, { versionId: version.versionId, path: 'src/missing.ts' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('lists every recorded file with its size, role and whether its text can be read', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const version = await publish(owner, seed, 'Tree walk')

    const tree = await content.sourceTree({ userId: owner }, { versionId: version.versionId })

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

  it('refuses the file tree of a private course to another user', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo()
    const version = await publish(owner, seed, 'Private tree')

    await expect(
      content.sourceTree({ userId: stranger }, { versionId: version.versionId }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('serialises concurrent publishes for the same course into distinct version numbers', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    await publish(owner, seed, 'Baseline')
    const jobs = await Promise.all([1, 2, 3].map(() => seedJob(owner, seed.snapshotId)))

    const results = await Promise.all(
      jobs.map((jobId, index) => publishFor(owner, seed, jobId, `Racer ${index}`)),
    )

    expect(new Set(results.map((item) => item.courseId)).size).toBe(1)
    expect(results.map((item) => item.versionNo).sort()).toEqual([2, 3, 4])
  })

  it('creates one course when two first publishes race for the same user and repository', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const jobs = await Promise.all([1, 2].map(() => seedJob(owner, seed.snapshotId)))

    const results = await Promise.all(
      jobs.map((jobId, index) => publishFor(owner, seed, jobId, `First ${index}`)),
    )

    expect(results[0]?.courseId).toBe(results[1]?.courseId)
    expect(results.map((item) => item.versionNo).sort()).toEqual([1, 2])
    const rows = await db.select().from(courses).where(eq(courses.userId, owner))
    expect(rows).toHaveLength(1)
  })

  it('does not duplicate child rows when the same job publishes twice concurrently', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const jobId = await seedJob(owner, seed.snapshotId)

    const results = await Promise.all([
      publishFor(owner, seed, jobId, 'Twice'),
      publishFor(owner, seed, jobId, 'Twice'),
    ])

    expect(results[0]).toEqual(results[1])
    const versions = await db
      .select()
      .from(courseVersions)
      .where(eq(courseVersions.generationJobId, jobId))
    expect(versions).toHaveLength(1)
    const lessons = await db
      .select()
      .from(courseLessons)
      .where(eq(courseLessons.versionId, versions[0]?.id ?? ''))
    expect(lessons).toHaveLength(1)
  })

  it('gives different users distinct slugs when their first publishes race on one repository', async () => {
    const first = await seedUser()
    const second = await seedUser()
    const seed = await seedRepo()
    const [jobA, jobB] = await Promise.all([
      seedJob(first, seed.snapshotId),
      seedJob(second, seed.snapshotId),
    ])

    const [a, b] = await Promise.all([
      publishFor(first, seed, jobA, 'Alpha'),
      publishFor(second, seed, jobB, 'Beta'),
    ])

    const rows = await db
      .select({ id: courses.id, slug: courses.slug })
      .from(courses)
      .where(eq(courses.repositoryId, seed.repositoryId))
    expect(rows).toHaveLength(2)
    expect(new Set(rows.map((row) => row.slug)).size).toBe(2)
    expect(rows.map((row) => row.slug)).toContain(seed.name)
    expect(a.courseId).not.toBe(b.courseId)
  })

  it('counts drafts and the total in one query', async () => {
    const owner = await seedUser()
    const seedA = await seedRepo()
    const seedB = await seedRepo()
    const seedC = await seedRepo()
    const draftJob = await seedJob(owner, seedA.snapshotId)
    await db.transaction((tx) =>
      publisher.publishVersion(tx, {
        userId: owner,
        repositoryId: seedA.repositoryId,
        snapshotId: seedA.snapshotId,
        jobId: draftJob,
        audience: 'intermediate',
        content: contentOf('Draft one', seedA.name),
        report: { ...report, draft: true },
        generator,
      }),
    )
    await publish(owner, seedB, 'Published one')
    await publish(owner, seedC, 'Published two')

    expect(await catalog.counts(owner)).toEqual({ total: 3, draft: 1 })
    expect(await catalog.counts(await seedUser())).toEqual({ total: 0, draft: 0 })
  })

  it('slugifies without leaving a trailing dash after truncation', () => {
    const name = `${'a'.repeat(59)}.tail-of-the-name`
    expect(slugify(name)).toBe('a'.repeat(59))
    expect(slugify('---')).toBe('course')
    expect(slugify('My_Repo.js')).toBe('my-repo-js')
  })

  it('deletes only the owner’s course and returns NOT_FOUND to anyone else', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo()
    await publish(owner, seed, 'Delete me')
    const { items } = await catalog.list(owner, { limit: 25 })
    const target = items.find((item) => item.title === 'Delete me')
    expect(target).toBeDefined()
    if (!target) return

    await expect(manager.deleteCourse(stranger, target.id)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await manager.deleteCourse(owner, target.id)
    const after = await catalog.list(owner, { limit: 25 })
    expect(after.items.map((item) => item.id)).not.toContain(target.id)
  })

  it('searches only the caller’s titles', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo()
    await publish(owner, seed, 'Searchable cart tour')
    await publish(stranger, seed, 'Searchable cart tour')

    expect((await catalog.counts(owner)).total).toBe(1)

    const found = await catalog.searchOwn(owner, 'cart tour', 10)
    expect(found.courses.map((item) => item.title)).toEqual(['Searchable cart tour'])
    expect(found.lessons).toEqual([])

    const lessons = await catalog.searchOwn(owner, 'map', 10)
    expect(lessons.lessons).toEqual([
      expect.objectContaining({
        lessonKey: 'map',
        courseTitle: 'Searchable cart tour',
        ...lookup(seed),
      }),
    ])
    expect(lessons.courses).toEqual([])
  })

  it('resolves a course link only for a viewer who can read it', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const seed = await seedRepo()
    const version = await publish(owner, seed, 'Linked walk')
    const versionAccess = createVersionAccess(db)

    expect(await versionAccess.refOf({ userId: owner }, version.courseId)).toEqual(lookup(seed))
    expect(await versionAccess.refOf({ userId: stranger }, version.courseId)).toBeUndefined()
    expect(await versionAccess.refOf({ userId: owner }, randomUUID())).toBeUndefined()
  })

  it('lists recent publications in the caller’s time zone', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    await publish(owner, seed, 'Recent walk')

    const items = await catalog.recentPublished(owner, {
      zone: 'Asia/Karachi',
      limit: 10,
      offset: 0,
    })
    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      kind: 'course_published',
      link: `/courses/acme/${seed.name}/${seed.name}`,
    })
    expect(items[0]?.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
