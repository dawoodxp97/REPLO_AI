import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Budget } from '@replo/ai'
import { scriptedModel, type Scripted } from '@replo/ai/testing'
import type { ModelPlan } from '@replo/contracts'
import { ANALYZER_VERSION, DEFAULT_EXTRACTION_LIMITS } from '@replo/repo-analysis'
import { eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  jobStageOutputs,
  lessonIndex,
  repositories,
  repoSnapshots,
  snapshotFiles,
  symbols,
  fileEdges,
  tutorials,
  tutorialSourceRefs,
  tutorialVersions,
} from '../../platform/db/schema'
import type { GithubRest } from '../../platform/github/client'
import { createLogger } from '../../platform/logger'
import { handleGenerateTutorial } from '../../jobs/generate-tutorial.worker'
import { bundledCatalog, fakeKeyChecker, testVault } from '../../test/domain'
import { FIXTURE_FILES, fixtureData } from '../../test/grounding'
import { createJobRuntime, type JobRuntime } from '../generation/job-runtime.service'
import { createJobService, type JobService } from '../generation/jobs.service'
import { createIndexingService, type IndexingService } from '../indexing/indexing.service'
import { createKeysService, type KeysService } from '../keys/keys.service'
import { createNotificationsService } from '../notifications/notifications.service'
import { createTutorialPublisher, type TutorialPublisher } from '../tutorials/publisher.service'
import { createPipelineService, type PipelineService } from './pipeline.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const SHA = 'a'.repeat(40)
const AUDIENCE = 'intermediate' as const

const LITE_PLAN = {
  architecture: {
    blocks: [
      {
        type: 'prose',
        kind: 'observed',
        md: 'The cart keeps items in memory through `addToCart`.',
        evidence: [{ path: 'src/cart.ts', symbol: 'addToCart' }],
      },
    ],
    openQuestions: ['Is the cart persisted between requests?'],
  },
  outline: {
    title: 'Shop cart walkthrough',
    objectives: ['Explain how items reach the cart'],
    prerequisites: ['TypeScript basics'],
    chapters: [
      {
        key: 'orientation',
        title: 'Orientation',
        summary: 'Where the cart lives',
        objectives: ['Locate the cart'],
        prerequisites: [],
        lessons: [{ key: 'map', title: 'The map', minutes: 5, focusPaths: ['src/cart.ts'] }],
      },
      {
        key: 'requests',
        title: 'Requests',
        summary: 'How a request reaches the cart',
        objectives: ['Trace a request'],
        prerequisites: ['Orientation'],
        lessons: [
          { key: 'route', title: 'The route', minutes: 6, focusPaths: ['src/api/routes.ts'] },
        ],
      },
      {
        key: 'wrap-up',
        title: 'Wrap-up',
        summary: 'Review the flow',
        objectives: ['Recall the flow'],
        prerequisites: [],
        lessons: [
          {
            key: 'review',
            title: 'Review',
            minutes: 3,
            focusPaths: ['src/cart.ts', 'src/api/routes.ts'],
          },
        ],
      },
    ],
  },
}

const FULL_ARCHITECTURE = { blocks: LITE_PLAN.architecture.blocks, openQuestions: [] }

const LESSONS: Record<string, unknown> = {
  map: {
    key: 'map',
    title: 'The map',
    minutes: 5,
    blocks: [
      {
        type: 'prose',
        kind: 'observed',
        md: '`loadCart` returns an empty list.',
        evidence: [{ path: 'src/cart.ts', symbol: 'loadCart' }],
      },
      {
        type: 'prose',
        kind: 'observed',
        md: 'New items are pushed onto `items`.',
        evidence: [{ path: 'src/cart.ts', quote: 'items.push(item) is missing here' }],
      },
    ],
    quiz: [],
  },
  route: {
    key: 'route',
    title: 'The route',
    minutes: 6,
    blocks: [
      {
        type: 'diagram',
        mermaid: 'flowchart LR\n  A[Route] --> B[Cart]',
        nodeRefs: { A: 'src/api/routes.ts', B: 'src/cart.ts' },
        caption: 'Request flow',
      },
      {
        type: 'code',
        source: { path: 'src/api/routes.ts', symbol: 'postCart' },
        caption: 'The route handler',
      },
      {
        type: 'prose',
        kind: 'observed',
        md: '`postCart` delegates to `addToCart`.',
        evidence: [{ path: 'src/api/routes.ts', symbol: 'postCart' }],
      },
    ],
    quiz: [
      {
        key: 'delegates',
        kind: 'true_false',
        prompt: '`postCart` delegates to `addToCart`.',
        options: [
          { key: 'true', text: 'True' },
          { key: 'false', text: 'False' },
        ],
        correct: 'true',
        explanation: 'The handler returns the result of `addToCart`.',
        evidence: [{ path: 'src/api/routes.ts', symbol: 'postCart' }],
      },
    ],
  },
  review: {
    key: 'review',
    title: 'Review',
    minutes: 3,
    blocks: [
      { type: 'callout', tone: 'tip', md: 'Read the cart before the route.' },
      {
        type: 'exercise',
        prompt: 'Find where items are pushed.',
        hints: ['Start in `addToCart`.'],
      },
    ],
    quiz: [],
  },
}

const FIXED_MAP = {
  ...(LESSONS.map as Record<string, unknown>),
  blocks: [
    (LESSONS.map as { blocks: unknown[] }).blocks[0],
    {
      type: 'prose',
      kind: 'observed',
      md: 'New items are pushed onto `items`.',
      evidence: [{ path: 'src/cart.ts', quote: 'items.push(item)' }],
    },
  ],
}

const steeredLesson = (key: string) => {
  const lesson = LESSONS[key] as { blocks: unknown[] }
  return {
    ...lesson,
    blocks: [
      {
        type: 'prose',
        kind: 'observed',
        md: 'Install it first: [setup guide](javascript:alert(document.cookie)), see https://evil.example/install, then run <img src=x onerror=alert(1)>.',
        evidence: [{ path: 'src/cart.ts', symbol: 'addToCart' }],
      },
      ...lesson.blocks,
    ],
  }
}

const CHAPTER_LESSONS: Record<string, string[]> = {
  orientation: ['map'],
  requests: ['route'],
  'wrap-up': ['review'],
}

function chapterKeyOf(prompt: string): string {
  const match = /<repo_data label="chapter">\n([\s\S]*?)\n<\/repo_data>/.exec(prompt)
  const spec = JSON.parse(match?.[1] ?? '{}') as { key?: string }
  return spec.key ?? ''
}

function lessonOf(prompt: string): string {
  const match = /<repo_data label="lesson">\n([\s\S]*?)\n<\/repo_data>/.exec(prompt)
  return (JSON.parse(match?.[1] ?? '{}') as { key?: string }).key ?? ''
}

function respondWith(options: { pipeline: 'lite' | 'full'; judge: boolean }): Scripted {
  return (prompt) => {
    if (prompt.includes('Do two things')) return LITE_PLAN
    if (prompt.includes('Describe how this repository is structured')) return FULL_ARCHITECTURE
    if (prompt.includes('Plan the learning path for this repository')) return LITE_PLAN.outline
    if (prompt.includes('The lesson in the lesson section has grounding problems')) {
      return lessonOf(prompt) === 'map' ? FIXED_MAP : LESSONS[lessonOf(prompt)]
    }
    if (prompt.includes('Write the lessons for the chapter')) {
      const lessons = CHAPTER_LESSONS[chapterKeyOf(prompt)] ?? []
      return { lessons: lessons.map((key) => LESSONS[key]), openQuestions: [] }
    }
    if (prompt.includes('Score the chapter') && options.judge) return { score: 0.9, issues: [] }
    throw new Error(`unexpected prompt: ${prompt.slice(0, 120)}`)
  }
}

describe.skipIf(DATABASE_URL === '')('tutorial pipeline against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let jobs: JobService
  let runtime: JobRuntime
  let indexing: IndexingService
  let keys: KeysService
  let publisher: TutorialPublisher
  let pipelines: PipelineService
  let snapshotRoot: string
  const log = createLogger({ level: 'silent' })
  const vault = testVault()
  const offlineRest = {
    request: async () => {
      throw new Error('network is off in tests')
    },
  } as unknown as GithubRest

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(
      sql`truncate table "user", repositories, provider_keys restart identity cascade`,
    )
    snapshotRoot = await mkdtemp(join(tmpdir(), 'replo-pipeline-'))
    indexing = createIndexingService({
      db,
      rest: offlineRest,
      tokens: { installationToken: async () => undefined },
      sources: { ingestSource: async () => undefined },
      limits: { maxFiles: 5000, maxBytes: 50_000_000 },
      extraction: DEFAULT_EXTRACTION_LIMITS,
      snapshotRoot,
    })
    const queue = { send: async () => null }
    const notifications = createNotificationsService(db)
    jobs = createJobService({ db, queue, indexing, notifications })
    runtime = createJobRuntime({ db, queue, notifications })
    keys = createKeysService({ db, vault, checker: fakeKeyChecker('valid'), jobs })
    publisher = createTutorialPublisher(db)
  })

  afterAll(async () => {
    await rm(snapshotRoot, { recursive: true, force: true })
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedSnapshot = async () => {
    const [repository] = await db
      .insert(repositories)
      .values({
        githubRepoId: Math.floor(Math.random() * 1_000_000_000) + 1,
        owner: 'acme',
        name: 'shop',
        isPrivate: false,
        defaultBranch: 'main',
        license: 'MIT',
      })
      .returning({ id: repositories.id })
    if (!repository) throw new Error('repository seed failed')

    const data = fixtureData()
    const analysis = {
      analyzerVersion: ANALYZER_VERSION,
      framework: null,
      entryPoints: [],
      routes: [],
      metrics: {},
      unresolvedImports: 0,
      parseErrors: [],
    }
    const [snapshot] = await db
      .insert(repoSnapshots)
      .values({
        repositoryId: repository.id,
        commitSha: SHA,
        analyzerVersion: ANALYZER_VERSION,
        status: 'ready',
        stats: {
          fileCount: data.files.length,
          sourceFileCount: data.files.length,
          indexableFileCount: data.files.length,
          totalBytes: data.files.reduce((sum, file) => sum + file.sizeBytes, 0),
          languages: { typescript: data.files.length },
          framework: null,
        },
        analysis,
      })
      .returning({ id: repoSnapshots.id })
    if (!snapshot) throw new Error('snapshot seed failed')

    await db.insert(snapshotFiles).values(
      data.files.map((file) => ({
        snapshotId: snapshot.id,
        path: file.path,
        blobSha: file.blobSha,
        language: 'typescript' as const,
        sizeBytes: file.sizeBytes,
        role: 'source' as const,
      })),
    )
    await db
      .insert(symbols)
      .values(data.symbols.map((symbol) => ({ ...symbol, snapshotId: snapshot.id })))
    await db.insert(fileEdges).values(
      data.edges.map((edge) => ({
        snapshotId: snapshot.id,
        fromPath: edge.fromPath,
        toPath: edge.toPath,
        kind: edge.kind,
      })),
    )
    for (const [path, text] of Object.entries(FIXTURE_FILES)) {
      const target = join(snapshotRoot, snapshot.id, path)
      await mkdir(dirname(target), { recursive: true })
      await writeFile(target, text)
    }
    return { repositoryId: repository.id, snapshotId: snapshot.id }
  }

  const seedKey = async (userId: string) => {
    const outcome = await keys.add(userId, {
      provider: 'anthropic',
      label: 'default',
      apiKey: 'sk-test-pipeline-0000',
    })
    if (outcome.kind !== 'ok') throw new Error('key seed failed')
    return outcome.value.id
  }

  const startJob = async (input: {
    userId: string
    snapshotId: string
    keyId: string
    pipeline: 'lite' | 'full'
    budgetMicros?: number
  }) => {
    const budgetMicros = input.budgetMicros ?? 2_000_000
    const models: ModelPlan = {
      provider: 'anthropic',
      preset: input.pipeline === 'lite' ? 'budget' : 'balanced',
      pipeline: input.pipeline,
      models: {
        planner: input.pipeline === 'lite' ? 'claude-haiku-5-5' : 'claude-sonnet-5-5',
        author: 'claude-haiku-5-5',
        summarizer: null,
        judge: input.pipeline === 'full' ? 'claude-sonnet-5-5' : null,
      },
      budgetMicros,
    }
    const { job } = await db.transaction((tx) =>
      jobs.createJob(tx, {
        userId: input.userId,
        snapshotId: input.snapshotId,
        idempotencyKey: randomUUID(),
        audience: AUDIENCE,
        keyId: input.keyId,
        models,
        budgetMicros,
      }),
    )
    return job
  }

  const runWith = async (
    job: { id: string; userId: string; snapshotId: string },
    script: Scripted,
  ) => {
    pipelines = createPipelineService({
      db,
      indexing,
      keys,
      catalog: bundledCatalog(),
      resolve: () => scriptedModel(script),
      jobs,
      tutorials: publisher,
    })
    await handleGenerateTutorial(
      { v: 1, jobId: job.id, userId: job.userId, snapshotId: job.snapshotId, audience: AUDIENCE },
      {
        jobs: runtime.jobStore,
        log,
        stageHandlers: pipelines.stageHandlers,
        budgetFor: (row) => new Budget(row.budgetMicros, runtime.usageSink, row.spentMicros),
        heartbeatMs: 60_000,
      },
    )
    return jobs.getOwnedJob(job.userId, job.id)
  }

  it('publishes a grounded lite tutorial and repairs the one weak lesson', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })

    const after = await runWith(job, respondWith({ pipeline: 'lite', judge: false }))

    expect(after.status).toBe('succeeded')
    expect(after.tutorialId).not.toBeNull()

    const [tutorial] = await db.select().from(tutorials).where(eq(tutorials.userId, owner))
    expect(tutorial).toMatchObject({ slug: 'shop', title: 'Shop cart walkthrough' })

    const [version] = await db
      .select()
      .from(tutorialVersions)
      .where(eq(tutorialVersions.generationJobId, job.id))
    expect(version).toMatchObject({ status: 'published', versionNo: 1 })
    expect(version?.validationReport).toMatchObject({ repairs: 1, draft: false, judgeScore: null })
    expect(version?.content?.chapters.map((chapter) => chapter.key)).toEqual([
      'orientation',
      'requests',
      'wrap-up',
    ])
    expect(version?.content?.architecture?.diagram.nodeRefs).toEqual({
      g0: 'src',
      g1: 'src/api',
    })

    const lessons = await db
      .select()
      .from(lessonIndex)
      .where(eq(lessonIndex.versionId, version?.id ?? ''))
    expect(lessons.map((row) => row.lessonKey).sort()).toEqual(['map', 'review', 'route'])

    const refs = await db
      .select()
      .from(tutorialSourceRefs)
      .where(eq(tutorialSourceRefs.versionId, version?.id ?? ''))
    expect(refs.length).toBe(Object.keys(version?.content?.sourceRefs ?? {}).length)
    expect(refs.length).toBeGreaterThan(0)

    const leftovers = await db
      .select()
      .from(jobStageOutputs)
      .where(eq(jobStageOutputs.jobId, job.id))
    expect(leftovers).toEqual([])
  })

  it('publishes no link, markup or command that a steered model wrote', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })

    const steered = respondWith({ pipeline: 'lite', judge: false })
    const script: Scripted = (prompt) => {
      if (prompt.includes('Write the lessons for the chapter')) {
        const lessons = CHAPTER_LESSONS[chapterKeyOf(prompt)] ?? []
        return { lessons: lessons.map(steeredLesson), openQuestions: [] }
      }
      return steered(prompt)
    }

    const after = await runWith(job, script)

    expect(after.status).toBe('succeeded')
    const [version] = await db
      .select()
      .from(tutorialVersions)
      .where(eq(tutorialVersions.generationJobId, job.id))
    expect(version).toMatchObject({ status: 'published' })
    const published = JSON.stringify(version?.content)
    for (const fragment of ['evil.example', 'javascript:', 'onerror', '<img', 'curl', '| sh']) {
      expect(published).not.toContain(fragment)
    }
    expect(published).toContain('setup guide')
  })

  it('runs the full pipeline with a judge and records the judge score', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'full' })

    const after = await runWith(job, respondWith({ pipeline: 'full', judge: true }))

    expect(after.status).toBe('succeeded')
    const [version] = await db
      .select()
      .from(tutorialVersions)
      .where(eq(tutorialVersions.generationJobId, job.id))
    expect(version?.generator).toMatchObject({ pipeline: 'full', pipelineVersion: 1 })
    expect(version?.validationReport).toMatchObject({ judgeScore: 0.9, draft: false })
  })

  it('resumes after a failed chapter without repeating finished chapters', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })

    const calls: string[] = []
    const crashing: Scripted = (prompt) => {
      if (prompt.includes('Write the lessons') && chapterKeyOf(prompt) === 'requests')
        throw new Error('provider exploded')
      const reply = respondWith({ pipeline: 'lite', judge: false })
      if (prompt.includes('Write the lessons')) calls.push(chapterKeyOf(prompt))
      return reply(prompt)
    }
    const failed = await runWith(job, crashing)
    expect(failed.status).toBe('failed')
    expect(calls).toEqual(['orientation'])

    await jobs.retry(owner, job.id)
    const resumed: string[] = []
    const healthy: Scripted = (prompt) => {
      if (prompt.includes('Write the lessons')) resumed.push(chapterKeyOf(prompt))
      return respondWith({ pipeline: 'lite', judge: false })(prompt)
    }
    const recovered = await runWith(job, healthy)

    expect(recovered.status).toBe('succeeded')
    expect(resumed).toEqual(['requests', 'wrap-up'])
  })

  it('stops at the budget ceiling before any model call', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({
      userId: owner,
      snapshotId,
      keyId,
      pipeline: 'lite',
      budgetMicros: 1,
    })

    const calls: string[] = []
    const after = await runWith(job, (prompt) => {
      calls.push(prompt.slice(0, 20))
      return LITE_PLAN
    })

    expect(after.status).toBe('failed')
    expect(after.errorCode).toBe('BUDGET_EXCEEDED')
    expect(calls).toEqual([])
  })
})
