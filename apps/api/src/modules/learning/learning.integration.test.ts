import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { and, eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { TutorialContent, ValidationReport } from '@replo/contracts'
import { ANALYZER_VERSION } from '@replo/repo-analysis'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  generationJobs,
  learningProgress,
  quizAttempts,
  repositories,
  repoSnapshots,
} from '../../platform/db/schema'
import { createTutorialPublisher, type TutorialPublisher } from '../tutorials/publisher.service'
import { createTutorialReader } from '../tutorials/reader.service'
import { createLearningService, type LearningService } from './learning.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const SHA = 'c'.repeat(40)
const BLOB = 'b'.repeat(40)

type Chapter = TutorialContent['chapters'][number]
type Question = NonNullable<Chapter['lessons'][number]['quiz']>[number]
interface Seed {
  repositoryId: string
  snapshotId: string
  name: string
}

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

const memory: Question = {
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
}

const total: Question = {
  key: 'total',
  kind: 'multiple_choice',
  prompt: 'How is the order total computed?',
  options: [
    { key: 'average', text: 'An average of the prices' },
    { key: 'sum', text: 'A sum of the line items' },
    { key: 'last', text: 'The last line item' },
  ],
  correct: 'sum',
  explanation: 'Totals add up every line item.',
  evidence: [{ refId: 'r_cart' }],
}

const cartChapters: Chapter[] = [
  {
    key: 'orientation',
    title: 'Orientation',
    summary: 'Where the cart lives',
    objectives: [],
    prerequisites: [],
    lessons: [
      { key: 'map', title: 'The map', minutes: 5, blocks: [], quiz: [memory] },
      { key: 'cart', title: 'The cart', minutes: 8, blocks: [] },
    ],
  },
  {
    key: 'flow',
    title: 'Flow',
    summary: 'How checkout runs',
    objectives: [],
    prerequisites: [],
    lessons: [{ key: 'checkout', title: 'Checkout', minutes: 6, blocks: [], quiz: [total] }],
  },
]

const revisedChapters: Chapter[] = [
  {
    key: 'orientation',
    title: 'Orientation',
    summary: 'Where the cart lives',
    objectives: [],
    prerequisites: [],
    lessons: [{ key: 'map', title: 'The map', minutes: 5, blocks: [] }],
  },
  {
    key: 'flow',
    title: 'Flow',
    summary: 'How checkout runs',
    objectives: [],
    prerequisites: [],
    lessons: [
      { key: 'checkout', title: 'Checkout', minutes: 6, blocks: [] },
      { key: 'recap', title: 'Recap', minutes: 3, blocks: [] },
    ],
  },
]

const tutorialContent = (name: string, chapters: Chapter[]): TutorialContent => ({
  schemaVersion: 1,
  meta: {
    title: 'Cart tour',
    repo: { owner: 'acme', name, commitSha: SHA },
    audience: 'intermediate',
    objectives: ['Follow the cart'],
    prerequisites: [],
  },
  chapters,
  sourceRefs: { r_cart: { path: 'src/cart.ts', startLine: 1, endLine: 3, blobSha: BLOB } },
  furtherReading: [],
  openQuestions: [],
})

describe.skipIf(DATABASE_URL === '')('learning progress against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let publisher: TutorialPublisher
  let learning: LearningService
  let nextGithubId = 9_300_000

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(sql`truncate table "user", repositories restart identity cascade`)
    publisher = createTutorialPublisher(db)
    learning = createLearningService({ db, tutorials: createTutorialReader(db) })
  })

  afterAll(async () => {
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(user).values({ id, name: 'Learner', email: `${id}@test.invalid` })
    return id
  }

  const seedRepo = async () => {
    const name = `shop-${randomUUID().slice(0, 8)}`
    nextGithubId += 1
    const [repo] = await db
      .insert(repositories)
      .values({
        githubRepoId: nextGithubId,
        owner: 'acme',
        name,
        isPrivate: false,
        defaultBranch: 'main',
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
      })
      .returning({ id: repoSnapshots.id })
    if (!snapshot) throw new Error('snapshot seed failed')
    return { repositoryId: repo.id, snapshotId: snapshot.id, name }
  }

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

  const publish = async (owner: string, seed: Seed, chapters: Chapter[]) => {
    const jobId = await seedJob(owner, seed.snapshotId)
    return db.transaction((tx) =>
      publisher.publishVersion(tx, {
        userId: owner,
        repositoryId: seed.repositoryId,
        snapshotId: seed.snapshotId,
        jobId,
        audience: 'intermediate',
        content: tutorialContent(seed.name, chapters),
        report,
        generator,
      }),
    )
  }

  it('counts completed lessons and points at the next unfinished one', async () => {
    const owner = await seedUser()
    const { tutorialId, versionId } = await publish(owner, await seedRepo(), cartChapters)

    expect(await learning.progress(owner, { tutorialId })).toEqual({
      tutorialId,
      versionId,
      lessons: {},
      completed: 0,
      total: 3,
      nextLessonKey: 'map',
      quizAttempts: 0,
    })

    await learning.markLesson(owner, { versionId, lessonKey: 'map', status: 'completed' })
    await learning.markLesson(owner, { versionId, lessonKey: 'cart', status: 'in_progress' })
    expect(await learning.progress(owner, { tutorialId, versionId })).toEqual({
      tutorialId,
      versionId,
      lessons: { map: 'completed', cart: 'in_progress' },
      completed: 1,
      total: 3,
      nextLessonKey: 'cart',
      quizAttempts: 0,
    })

    await learning.markLesson(owner, { versionId, lessonKey: 'cart', status: 'completed' })
    await learning.markLesson(owner, { versionId, lessonKey: 'checkout', status: 'completed' })
    expect(await learning.progress(owner, { tutorialId })).toMatchObject({
      completed: 3,
      total: 3,
      nextLessonKey: null,
    })
  })

  it('carries completed lessons into a regenerated version with the same lesson keys', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const first = await publish(owner, seed, cartChapters)
    await learning.markLesson(owner, {
      versionId: first.versionId,
      lessonKey: 'map',
      status: 'completed',
    })
    await learning.markLesson(owner, {
      versionId: first.versionId,
      lessonKey: 'cart',
      status: 'in_progress',
    })

    const second = await publish(owner, seed, revisedChapters)
    expect(second.tutorialId).toBe(first.tutorialId)
    expect(await learning.progress(owner, { tutorialId: second.tutorialId })).toEqual({
      tutorialId: second.tutorialId,
      versionId: second.versionId,
      lessons: { map: 'completed' },
      completed: 1,
      total: 3,
      nextLessonKey: 'checkout',
      quizAttempts: 0,
    })
    expect(await learning.completionRatio({ userId: owner }, second.versionId)).toBeCloseTo(1 / 3)
    const batched = await learning.completionRatios(owner, [
      { tutorialId: second.tutorialId, versionId: second.versionId },
    ])
    expect(batched.get(second.versionId)).toBeCloseTo(1 / 3)
  })

  it('marks and unmarks a lesson across every version and refuses unknown lessons', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const first = await publish(owner, seed, cartChapters)
    const second = await publish(owner, seed, revisedChapters)

    expect(
      await learning.markLesson(owner, {
        versionId: first.versionId,
        lessonKey: 'map',
        status: 'completed',
      }),
    ).toMatchObject({ lessons: { map: 'completed' }, completed: 1 })
    const afterUnmark = await learning.unmarkLesson(owner, {
      versionId: second.versionId,
      lessonKey: 'map',
    })
    expect(afterUnmark.lessons).toEqual({})
    expect(afterUnmark).toMatchObject({ completed: 0, nextLessonKey: 'map' })
    expect(
      await db.select().from(learningProgress).where(eq(learningProgress.userId, owner)),
    ).toEqual([])

    await expect(
      learning.markLesson(owner, {
        versionId: first.versionId,
        lessonKey: 'missing',
        status: 'completed',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })

  it('grades a quiz answer and keeps the attempts', async () => {
    const owner = await seedUser()
    const { tutorialId, versionId } = await publish(owner, await seedRepo(), cartChapters)

    expect(
      await learning.submitQuiz(owner, {
        versionId,
        lessonKey: 'map',
        questionKey: 'memory',
        choiceKey: 'false',
      }),
    ).toEqual({
      correct: false,
      correctKey: 'true',
      explanation: 'The cart array is module state.',
    })
    expect(
      await learning.submitQuiz(owner, {
        versionId,
        lessonKey: 'map',
        questionKey: 'memory',
        choiceKey: 'true',
      }),
    ).toEqual({
      correct: true,
      correctKey: 'true',
      explanation: 'The cart array is module state.',
    })

    const attempts = await db.select().from(quizAttempts).where(eq(quizAttempts.userId, owner))
    expect(attempts).toHaveLength(2)
    expect(attempts.map(({ choiceKey, correct }) => ({ choiceKey, correct }))).toEqual(
      expect.arrayContaining([
        { choiceKey: 'false', correct: false },
        { choiceKey: 'true', correct: true },
      ]),
    )
    expect(await learning.progress(owner, { tutorialId })).toMatchObject({ quizAttempts: 2 })
  })

  it('rejects a choice that is not an option and a question the lesson does not have', async () => {
    const owner = await seedUser()
    const { versionId } = await publish(owner, await seedRepo(), cartChapters)

    await expect(
      learning.submitQuiz(owner, {
        versionId,
        lessonKey: 'map',
        questionKey: 'memory',
        choiceKey: 'maybe',
      }),
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      message: 'choice is not an option of this question',
    })
    await expect(
      learning.submitQuiz(owner, {
        versionId,
        lessonKey: 'map',
        questionKey: 'unknown',
        choiceKey: 'true',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await db.select().from(quizAttempts).where(eq(quizAttempts.userId, owner))).toEqual([])
  })

  it('reports another user private tutorial as not found and leaves it untouched', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const { tutorialId, versionId } = await publish(owner, await seedRepo(), cartChapters)
    await learning.markLesson(owner, { versionId, lessonKey: 'map', status: 'completed' })

    await expect(learning.progress(stranger, { tutorialId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(learning.progress(stranger, { tutorialId, versionId })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(learning.history(stranger, { tutorialId, limit: 25 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    await expect(
      learning.markLesson(stranger, { versionId, lessonKey: 'cart', status: 'completed' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      learning.unmarkLesson(stranger, { versionId, lessonKey: 'map' }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    await expect(
      learning.submitQuiz(stranger, {
        versionId,
        lessonKey: 'map',
        questionKey: 'memory',
        choiceKey: 'true',
      }),
    ).rejects.toMatchObject({ code: 'NOT_FOUND' })
    expect(await learning.completionRatio({ userId: stranger }, versionId)).toBeNull()
    const foreign = await learning.completionRatios(stranger, [{ tutorialId, versionId }])
    expect(foreign.get(versionId)).toBeNull()
    expect(await learning.resumeTarget(stranger)).toBeNull()

    expect(
      await db.select().from(learningProgress).where(eq(learningProgress.userId, stranger)),
    ).toEqual([])
    expect(await db.select().from(quizAttempts).where(eq(quizAttempts.userId, stranger))).toEqual(
      [],
    )
    expect(await learning.progress(owner, { tutorialId })).toMatchObject({
      lessons: { map: 'completed' },
      completed: 1,
    })
  })

  it('reports no completion ratio for a tutorial without lessons', async () => {
    const owner = await seedUser()
    const { tutorialId, versionId } = await publish(owner, await seedRepo(), [])

    expect(await learning.completionRatio({ userId: owner }, versionId)).toBeNull()
    expect(await learning.progress(owner, { tutorialId })).toEqual({
      tutorialId,
      versionId,
      lessons: {},
      completed: 0,
      total: 0,
      nextLessonKey: null,
      quizAttempts: 0,
    })
  })

  it('pages the lesson history with an offset cursor, newest first', async () => {
    const owner = await seedUser()
    const { tutorialId, versionId } = await publish(owner, await seedRepo(), cartChapters)
    for (const lessonKey of ['map', 'cart', 'checkout']) {
      await learning.markLesson(owner, { versionId, lessonKey, status: 'completed' })
    }
    const stamps = {
      map: '2026-10-01T10:00:00.000Z',
      cart: '2026-10-01T10:01:00.000Z',
      checkout: '2026-10-01T10:02:00.000Z',
    }
    for (const [lessonKey, at] of Object.entries(stamps)) {
      await db
        .update(learningProgress)
        .set({ updatedAt: new Date(at) })
        .where(and(eq(learningProgress.userId, owner), eq(learningProgress.lessonKey, lessonKey)))
    }

    const firstPage = await learning.history(owner, { tutorialId, limit: 2 })
    expect(firstPage).toEqual({
      items: [
        { lessonKey: 'checkout', title: 'Checkout', status: 'completed', at: stamps.checkout },
        { lessonKey: 'cart', title: 'The cart', status: 'completed', at: stamps.cart },
      ],
      nextCursor: '2',
    })

    const secondPage = await learning.history(owner, {
      tutorialId,
      limit: 2,
      cursor: firstPage.nextCursor ?? undefined,
    })
    expect(secondPage).toEqual({
      items: [{ lessonKey: 'map', title: 'The map', status: 'completed', at: stamps.map }],
      nextCursor: null,
    })
  })

  it('leaves out history rows whose lesson the version no longer has', async () => {
    const owner = await seedUser()
    const seed = await seedRepo()
    const first = await publish(owner, seed, cartChapters)
    await learning.markLesson(owner, {
      versionId: first.versionId,
      lessonKey: 'cart',
      status: 'completed',
    })
    await learning.markLesson(owner, {
      versionId: first.versionId,
      lessonKey: 'map',
      status: 'in_progress',
    })
    const second = await publish(owner, seed, revisedChapters)

    const page = await learning.history(owner, {
      tutorialId: second.tutorialId,
      versionId: second.versionId,
      limit: 25,
    })
    expect(page).toEqual({
      items: [
        { lessonKey: 'map', title: 'The map', status: 'in_progress', at: expect.any(String) },
      ],
      nextCursor: null,
    })
  })

  it('resumes the latest in-progress lesson and skips rows it cannot resolve', async () => {
    const owner = await seedUser()
    const other = await seedUser()
    const ownerTutorial = await publish(owner, await seedRepo(), cartChapters)
    const otherSeed = await seedRepo()
    const otherTutorial = await publish(other, otherSeed, cartChapters)
    expect(await learning.resumeTarget(other)).toBeNull()

    await learning.markLesson(other, {
      versionId: otherTutorial.versionId,
      lessonKey: 'map',
      status: 'in_progress',
    })
    await db.insert(learningProgress).values([
      {
        userId: other,
        tutorialId: ownerTutorial.tutorialId,
        versionId: ownerTutorial.versionId,
        lessonKey: 'cart',
        status: 'in_progress',
        updatedAt: new Date('2031-01-01T00:00:00.000Z'),
      },
      {
        userId: other,
        tutorialId: otherTutorial.tutorialId,
        versionId: otherTutorial.versionId,
        lessonKey: 'retired',
        status: 'in_progress',
        updatedAt: new Date('2032-01-01T00:00:00.000Z'),
      },
    ])

    expect(await learning.resumeTarget(other)).toEqual({
      tutorialId: otherTutorial.tutorialId,
      versionId: otherTutorial.versionId,
      lessonKey: 'map',
      lessonTitle: 'The map',
      owner: 'acme',
      repo: otherSeed.name,
      slug: otherSeed.name,
    })
  })
})
