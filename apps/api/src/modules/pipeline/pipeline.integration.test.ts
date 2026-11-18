import { randomUUID } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { RunLimits } from '@replo/ai'
import { scriptedModel, type Scripted } from '@replo/ai/testing'
import type { ModelPlan } from '@replo/contracts'
import { ANALYZER_VERSION, DEFAULT_EXTRACTION_LIMITS } from '@replo/repo-analysis'
import { eq, sql } from 'drizzle-orm'
import { applyDdl } from '../../platform/db/test-setup'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import {
  jobCheckpoints,
  repositories,
  repositorySnapshots,
  snapshotFiles,
  snapshotSymbols,
  snapshotFileEdges,
  courses,
  courseSourceRefs,
  courseVersions,
  diagramSpecs,
} from '../../platform/db/schema'
import type { GithubRest } from '../../platform/github/client'
import { createLogger } from '../../platform/logger'
import { CanceledError, JobError, StoppedError } from '../../worker/errors'
import { handleGenerateCourse } from '../../worker/generate-course'
import { bundledCatalog, fakeKeyChecker, testVault } from '../../test/domain'
import { FIXTURE_FILES, fixtureData } from '../../test/grounding'
import { createJobRuntime, type JobRuntime } from '../jobs/job-runtime.service'
import { createJobService, type JobService } from '../jobs/jobs.service'
import { createIndexingService, type IndexingService } from '../indexing/indexing.service'
import { createKeysService, type KeysService } from '../keys/keys.service'
import { createNotificationsService } from '../notifications/notifications.service'
import { createCoursePublisher, type CoursePublisher } from '../courses/publisher.service'
import { createVersionAccess } from '../courses/version-access.service'
import { createPipelineService, type PipelineService } from './pipeline.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''
const SHA = 'a'.repeat(40)
const AUDIENCE = 'intermediate' as const

const OUTLINE = {
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
      lessons: [{ key: 'route', title: 'The route', minutes: 6, focusPaths: ['src/api/routes.ts'] }],
    },
    {
      key: 'wrap-up',
      title: 'Wrap-up',
      summary: 'Review the flow',
      objectives: ['Recall the flow'],
      prerequisites: [],
      lessons: [
        { key: 'review', title: 'Review', minutes: 3, focusPaths: ['src/cart.ts'] },
      ],
    },
  ],
}

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
        evidence: [{ path: 'src/cart.ts', quote: 'items.push(item)' }],
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
      { type: 'exercise', prompt: 'Find where items are pushed.', hints: ['Start in `addToCart`.'] },
    ],
    quiz: [],
  },
}

const CHAPTER_LESSON: Record<string, string> = {
  orientation: 'map',
  requests: 'route',
  'wrap-up': 'review',
}

function chapterKeyOf(prompt: string): string {
  const match = /<repo_data label="chapter">\n([\s\S]*?)\n<\/repo_data>/.exec(prompt)
  return (JSON.parse(match?.[1] ?? '{}') as { key?: string }).key ?? ''
}

// Answers every prompt the lite pipeline issues: outline (planner) and lessons (author).
function liteScript(): Scripted {
  return (prompt) => {
    if (prompt.includes('Plan the learning path')) return OUTLINE
    if (prompt.includes('Write the lessons for the chapter')) {
      const key = CHAPTER_LESSON[chapterKeyOf(prompt)] ?? 'map'
      return { lessons: [LESSONS[key]], openQuestions: [] }
    }
    throw new Error(`unexpected prompt: ${prompt.slice(0, 120)}`)
  }
}

// Additionally answers the model-driven stages: enrich, flows, tours, diagrams, architecture.
function fullScript(): Scripted {
  const lite = liteScript()
  return (prompt) => {
    if (prompt.includes('For each file in the files section'))
      return {
        files: [
          { path: 'src/cart.ts', summary: 'Holds cart state.', layer: 'data', domain: 'cart' },
          { path: 'src/api/routes.ts', summary: 'HTTP routes.', layer: 'api', domain: 'cart' },
        ],
        concepts: [],
      }
    if (prompt.includes('end-to-end flows'))
      return { flows: [{ name: 'Add to cart', summary: 'A request adds an item.', steps: ['src/api/routes.ts', 'src/cart.ts'] }] }
    if (prompt.includes('guided tours'))
      return {
        tours: [
          {
            key: 'flow',
            title: 'Follow a request',
            objective: 'See how a request reaches the cart.',
            steps: [
              { title: 'Route', summary: 'The HTTP entry point.', nodeId: 'file:src/api/routes.ts' },
              { title: 'Cart', summary: 'The cart state.', nodeId: 'file:src/cart.ts' },
            ],
          },
        ],
      }
    if (prompt.includes('Produce up to four diagrams'))
      return {
        diagrams: [
          {
            id: 'sequence-add',
            type: 'sequence',
            title: 'Add to cart',
            caption: 'Route to cart',
            nodes: [
              { id: 'file:src/api/routes.ts', label: 'Route', kind: 'file' },
              { id: 'file:src/cart.ts', label: 'Cart', kind: 'file' },
            ],
            edges: [{ from: 'file:src/api/routes.ts', to: 'file:src/cart.ts', label: 'calls' }],
          },
        ],
      }
    if (prompt.includes('Describe how this repository is structured'))
      return {
        blocks: [
          {
            type: 'prose',
            kind: 'observed',
            md: '`addToCart` adds an item to the cart.',
            evidence: [{ path: 'src/cart.ts', symbol: 'addToCart' }],
          },
        ],
        openQuestions: [],
      }
    return lite(prompt)
  }
}

describe.skipIf(DATABASE_URL === '')('course pipeline against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let jobs: JobService
  let runtime: JobRuntime
  let indexing: IndexingService
  let keys: KeysService
  let publisher: CoursePublisher
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
    await applyDdl(pool)
    await db.execute(sql`truncate table users, repositories, provider_keys restart identity cascade`)
    snapshotRoot = await mkdtemp(join(tmpdir(), 'replo-pipeline-'))
    indexing = createIndexingService({
      db,
      rest: offlineRest,
      tokens: { installationToken: async () => undefined, userCanAccess: async () => true },
      sources: {
        ingestSource: async () => ({ owner: 'acme', name: 'shop', isPrivate: false, installationId: null }),
      },
      limits: { maxFiles: 5000, maxBytes: 50_000_000 },
      extraction: DEFAULT_EXTRACTION_LIMITS,
      snapshotRoot,
    })
    const queue = { send: async () => null }
    const notifications = createNotificationsService(db)
    jobs = createJobService({
      db,
      queue,
      indexing,
      notifications,
      courses: createVersionAccess(db),
      repositories: { describeLinked: async () => new Map() },
    })
    runtime = createJobRuntime({ db, queue, notifications })
    keys = createKeysService({ db, vault, checker: fakeKeyChecker('valid'), jobs })
    publisher = createCoursePublisher(db)
  })

  afterAll(async () => {
    await rm(snapshotRoot, { recursive: true, force: true })
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(users).values({ id, name: 'Developer', email: `${id}@test.invalid` })
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
      })
      .returning({ id: repositories.id })
    if (!repository) throw new Error('repository seed failed')

    const data = fixtureData()
    const [snapshot] = await db
      .insert(repositorySnapshots)
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
    await db.insert(snapshotSymbols).values(data.symbols.map((symbol) => ({ ...symbol, snapshotId: snapshot.id })))
    await db.insert(snapshotFileEdges).values(
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
    const outcome = await keys.add(userId, { provider: 'anthropic', label: 'default', apiKey: 'sk-test-pipeline-0000' })
    if (outcome.kind !== 'ok') throw new Error('key seed failed')
    return outcome.value.id
  }

  const startJob = async (input: {
    userId: string
    snapshotId: string
    keyId: string
    pipeline: 'lite' | 'full'
  }) => {
    const modelId = input.pipeline === 'lite' ? 'claude-haiku-5-5' : 'claude-sonnet-5-5'
    const models: ModelPlan = {
      provider: 'anthropic',
      pipeline: input.pipeline,
      models: { planner: modelId, author: 'claude-haiku-5-5', summarizer: modelId },
    }
    const { job } = await db.transaction((tx) =>
      jobs.createJob(tx, {
        userId: input.userId,
        snapshotId: input.snapshotId,
        idempotencyKey: randomUUID(),
        audience: AUDIENCE,
        providerKeyId: input.keyId,
        models,
      }),
    )
    return job
  }

  const runWith = async (
    job: { id: string; userId: string; snapshotId: string },
    script: Scripted,
    around?: (handlers: PipelineService['stageHandlers']) => PipelineService['stageHandlers'],
  ) => {
    const pipelines = createPipelineService({
      db,
      indexing,
      keys,
      catalog: bundledCatalog(),
      resolve: () => scriptedModel(script),
      jobs,
      courses: publisher,
    })
    await handleGenerateCourse(
      { jobId: job.id },
      {
        jobs: runtime.jobStore,
        log,
        stageHandlers: around ? around(pipelines.stageHandlers) : pipelines.stageHandlers,
        limitsFor: () => new RunLimits({ maxTokens: Number.MAX_SAFE_INTEGER }),
        heartbeatMs: 60_000,
      },
    )
    return jobs.getOwnedJob(job.userId, job.id)
  }

  it('publishes a grounded lite course with graph, tours, diagrams and normalised refs', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })

    const after = await runWith(job, liteScript())
    expect(after.status).toBe('succeeded')

    const [version] = await db.select().from(courseVersions).where(eq(courseVersions.generationJobId, job.id))
    expect(version).toMatchObject({ status: 'published', versionNo: 1 })
    const content = version?.content
    expect(content?.chapters.map((chapter) => chapter.key)).toEqual(['orientation', 'requests', 'wrap-up'])
    expect(content?.graph.nodes.length).toBeGreaterThan(0)
    expect(content?.tours.length).toBeGreaterThan(0)
    expect(content?.diagrams.map((diagram) => diagram.type)).toContain('architecture')
    expect(content?.architecture?.diagram.nodeRefs).toEqual({ g0: 'src', g1: 'src/api' })

    const storedDiagrams = await db.select().from(diagramSpecs).where(eq(diagramSpecs.versionId, version?.id ?? ''))
    expect(storedDiagrams.length).toBe(content?.diagrams.length)
    expect(storedDiagrams.length).toBeGreaterThan(0)

    const refs = await db.select().from(courseSourceRefs).where(eq(courseSourceRefs.versionId, version?.id ?? ''))
    expect(refs.length).toBe(Object.keys(content?.sourceRefs ?? {}).length)

    const leftovers = await db.select().from(jobCheckpoints).where(eq(jobCheckpoints.jobId, job.id))
    expect(leftovers).toEqual([])
  })

  it('runs the full model-driven stages and keeps only validated diagram nodes', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'full' })

    const after = await runWith(job, fullScript())
    expect(after.status).toBe('succeeded')

    const [version] = await db.select().from(courseVersions).where(eq(courseVersions.generationJobId, job.id))
    expect(version?.generator).toMatchObject({ pipeline: 'full' })
    const types = version?.content?.diagrams.map((diagram) => diagram.type) ?? []
    expect(types).toContain('architecture')
    expect(types).toContain('sequence')
    for (const diagram of version?.content?.diagrams ?? [])
      for (const node of diagram.nodes)
        expect(version?.content?.graph.nodes.map((n) => n.id)).toContain(node.id)
    expect(version?.validationReport?.draft).toBe(false)
  })

  it('a rerun publishes a new version and preserves the previous one', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()

    const first = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })
    await runWith(first, liteScript())
    const second = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })
    await runWith(second, liteScript())

    const [course] = await db.select().from(courses).where(eq(courses.userId, owner))
    const versions = await db.select().from(courseVersions).where(eq(courseVersions.courseId, course?.id ?? ''))
    expect(versions.map((version) => version.versionNo).sort()).toEqual([1, 2])
    expect(course?.currentVersionId).toBe(versions.find((version) => version.versionNo === 2)?.id)
  })

  it('does not publish when the job is canceled just before the publish transaction', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })

    const after = await runWith(job, liteScript(), (handlers) => ({
      ...handlers,
      publish: async (ctx) => {
        await jobs.cancel(owner, job.id)
        await handlers.publish(ctx)
      },
    }))

    expect(after.status).toBe('canceled')
    expect(after.courseId).toBeNull()
  })

  it('refuses a late publish from an orphaned run after the job left running', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })

    let orphan: Promise<void> = Promise.resolve()
    const after = await runWith(job, liteScript(), (handlers) => ({
      ...handlers,
      publish: async (ctx) => {
        orphan = (async () => {
          await new Promise((resolve) => setTimeout(resolve, 100))
          await handlers.publish(ctx)
        })()
        orphan.catch(() => undefined)
        throw new JobError('PROVIDER_UNAVAILABLE', false)
      },
    }))

    expect(after.status).toBe('failed')
    await expect(orphan).rejects.toBeInstanceOf(StoppedError)
  })

  it('fences on the attempt that claimed the job', async () => {
    const owner = await seedUser()
    const keyId = await seedKey(owner)
    const { snapshotId } = await seedSnapshot()
    const job = await startJob({ userId: owner, snapshotId, keyId, pipeline: 'lite' })
    const claimed = await runtime.jobStore.claim(job.id)
    if (!claimed) throw new Error('claim failed')

    await db.transaction((tx) => jobs.fenceRunning(tx, job.id, claimed.attempts))
    await expect(
      db.transaction((tx) => jobs.fenceRunning(tx, job.id, claimed.attempts - 1)),
    ).rejects.toBeInstanceOf(StoppedError)
    await jobs.cancel(owner, job.id)
    await expect(
      db.transaction((tx) => jobs.fenceRunning(tx, job.id, claimed.attempts)),
    ).rejects.toBeInstanceOf(CanceledError)
  })
})