import {
  JOB_STATUSES,
  LESSON_STATUSES,
  PROVIDERS,
  VISIBILITIES,
  type Audience,
  type CustomModels,
  type JobEventData,
  type JobEventType,
  type ModelPlan,
  type ModelPreset,
  type NotificationKind,
  type Pipeline,
  type SnapshotStats,
  type Stage,
  type Theme,
  type TutorialContent,
  type ValidationReport,
} from '@replo/contracts'
import type {
  EdgeRecord,
  EntryPoint,
  FileRole,
  Language,
  NodeMetrics,
  RouteRecord,
  SymbolRecord,
} from '@replo/repo-analysis'
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { uuidv7 } from 'uuidv7'
import { user } from './auth-schema'

const id = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7())
const ts = (name: string) => timestamp(name, { withTimezone: true })
const ownerId = () =>
  text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' })
const createdAt = () => ts('created_at').notNull().defaultNow()
const updatedAt = () => ts('updated_at').notNull().defaultNow()

export type SnapshotStatus = 'pending' | 'ready'

export interface TutorialGenerator {
  pipeline: Pipeline
  pipelineVersion: number
  analyzerVersion: number
  models: Record<string, string | null>
  promptVersions: Record<string, number>
  promptHashes: Record<string, string>
  budgetMicros: number
  spentMicros: number
}

export interface ErrorDetail {
  message: string
}

export interface SnapshotAnalysis {
  analyzerVersion: number
  framework: string | null
  entryPoints: EntryPoint[]
  routes: RouteRecord[]
  metrics: Record<string, NodeMetrics>
  unresolvedImports: number
  parseErrors: string[]
}

export const provider = pgEnum('provider', PROVIDERS)
export const jobStatus = pgEnum('job_status', JOB_STATUSES)
export const visibility = pgEnum('visibility', VISIBILITIES)
export const lessonStatus = pgEnum('lesson_status', LESSON_STATUSES)

export const githubInstallations = pgTable(
  'github_installations',
  {
    id: id(),
    githubInstallationId: bigint('github_installation_id', { mode: 'number' }).notNull().unique(),
    userId: ownerId(),
    accountLogin: text('account_login').notNull(),
    suspendedAt: ts('suspended_at'),
    deletedAt: ts('deleted_at'),
    createdAt: createdAt(),
  },
  (t) => [index('github_installations_user_idx').on(t.userId)],
)

export const repositories = pgTable(
  'repositories',
  {
    id: id(),
    githubRepoId: bigint('github_repo_id', { mode: 'number' }).notNull().unique(),
    owner: text('owner').notNull(),
    name: text('name').notNull(),
    isPrivate: boolean('is_private').notNull(),
    defaultBranch: text('default_branch').notNull(),
    license: text('license'),
  },
  (t) => [
    index('repositories_owner_name_idx').on(t.owner, t.name),
    index('repositories_name_trgm_idx').using('gin', t.name.op('gin_trgm_ops')),
  ],
)

export const userRepositories = pgTable(
  'user_repositories',
  {
    userId: ownerId(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id),
    installationId: bigint('installation_id', { mode: 'number' }),
    revokedAt: ts('revoked_at'),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.repositoryId] }),
    index('user_repositories_installation_idx').on(t.installationId),
  ],
)

export const providerKeys = pgTable(
  'provider_keys',
  {
    id: id(),
    userId: ownerId(),
    provider: provider('provider').notNull(),
    label: text('label').notNull().default('default'),
    ciphertext: text('ciphertext').notNull(),
    iv: text('iv').notNull(),
    keyVersion: integer('key_version').notNull(),
    last4: text('last4').notNull(),
    lastValidatedAt: ts('last_validated_at'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('provider_keys_user_provider_label_idx').on(t.userId, t.provider, t.label),
    index('provider_keys_user_idx').on(t.userId),
  ],
)

export const modelPreferences = pgTable('model_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  preset: text('preset').$type<ModelPreset>().notNull().default('balanced'),
  customModels: jsonb('custom_models').$type<CustomModels>(),
  defaultBudgetMicros: bigint('default_budget_micros', { mode: 'number' }),
})

export const repoSnapshots = pgTable(
  'repo_snapshots',
  {
    id: id(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id),
    commitSha: text('commit_sha').notNull(),
    analyzerVersion: integer('analyzer_version').notNull(),
    status: text('status').$type<SnapshotStatus>().notNull().default('pending'),
    stats: jsonb('stats').$type<SnapshotStats>(),
    analysis: jsonb('analysis').$type<SnapshotAnalysis>(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('repo_snapshots_repo_sha_analyzer_idx').on(
      t.repositoryId,
      t.commitSha,
      t.analyzerVersion,
    ),
    index('repo_snapshots_repo_created_idx').on(t.repositoryId, t.createdAt.desc()),
  ],
)

export const snapshotFiles = pgTable(
  'snapshot_files',
  {
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => repoSnapshots.id, { onDelete: 'cascade' }),
    path: text('path').notNull(),
    blobSha: text('blob_sha').notNull(),
    language: text('language').$type<Language>(),
    sizeBytes: integer('size_bytes').notNull(),
    role: text('role').$type<FileRole>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.snapshotId, t.path] }),
    index('snapshot_files_lang_idx').on(t.snapshotId, t.language),
    index('snapshot_files_blob_idx').on(t.blobSha),
  ],
)

export const symbols = pgTable(
  'symbols',
  {
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => repoSnapshots.id, { onDelete: 'cascade' }),
    symbolKey: text('symbol_key').notNull(),
    name: text('name').notNull(),
    kind: text('kind').$type<SymbolRecord['kind']>().notNull(),
    path: text('path').notNull(),
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    exported: boolean('exported').notNull().default(false),
    signature: text('signature'),
  },
  (t) => [
    primaryKey({ columns: [t.snapshotId, t.symbolKey] }),
    index('symbols_path_idx').on(t.snapshotId, t.path),
  ],
)

export const fileEdges = pgTable(
  'file_edges',
  {
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => repoSnapshots.id, { onDelete: 'cascade' }),
    fromPath: text('from_path').notNull(),
    toPath: text('to_path').notNull(),
    kind: text('kind').$type<EdgeRecord['kind']>().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.snapshotId, t.fromPath, t.toPath, t.kind] }),
    index('file_edges_to_idx').on(t.snapshotId, t.toPath),
  ],
)

export const tutorials = pgTable(
  'tutorials',
  {
    id: id(),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    visibility: visibility('visibility').notNull().default('private'),
    shareToken: text('share_token').unique(),
    currentVersionId: uuid('current_version_id'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('tutorials_user_repo_idx').on(t.userId, t.repositoryId),
    uniqueIndex('tutorials_repo_slug_idx').on(t.repositoryId, t.slug),
    index('tutorials_visibility_idx').on(t.visibility),
    index('tutorials_title_trgm_idx').using('gin', t.title.op('gin_trgm_ops')),
  ],
)

export const tutorialVersions = pgTable(
  'tutorial_versions',
  {
    id: id(),
    tutorialId: uuid('tutorial_id')
      .notNull()
      .references(() => tutorials.id, { onDelete: 'cascade' }),
    versionNo: integer('version_no').notNull(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => repoSnapshots.id),
    schemaVersion: integer('schema_version').notNull(),
    status: text('status').$type<'draft' | 'published'>().notNull().default('draft'),
    audience: text('audience').$type<Audience>().notNull(),
    content: jsonb('content').$type<TutorialContent>(),
    validationReport: jsonb('validation_report').$type<ValidationReport>(),
    generator: jsonb('generator').$type<TutorialGenerator>().notNull(),
    generationJobId: uuid('generation_job_id').references(() => generationJobs.id, {
      onDelete: 'set null',
    }),
    publishedAt: ts('published_at'),
  },
  (t) => [
    uniqueIndex('tutorial_versions_tutorial_no_idx').on(t.tutorialId, t.versionNo),
    uniqueIndex('tutorial_versions_generation_job_idx').on(t.generationJobId),
    index('tutorial_versions_snapshot_idx').on(t.snapshotId),
  ],
)

export const lessonIndex = pgTable(
  'lesson_index',
  {
    versionId: uuid('version_id')
      .notNull()
      .references(() => tutorialVersions.id, { onDelete: 'cascade' }),
    chapterKey: text('chapter_key').notNull(),
    lessonKey: text('lesson_key').notNull(),
    title: text('title').notNull(),
    position: integer('position').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.versionId, t.lessonKey] }),
    index('lesson_index_title_trgm_idx').using('gin', t.title.op('gin_trgm_ops')),
  ],
)

export const tutorialSourceRefs = pgTable(
  'tutorial_source_refs',
  {
    versionId: uuid('version_id')
      .notNull()
      .references(() => tutorialVersions.id, { onDelete: 'cascade' }),
    lessonKey: text('lesson_key').notNull(),
    refId: text('ref_id').notNull(),
    path: text('path').notNull(),
    startLine: integer('start_line').notNull(),
    endLine: integer('end_line').notNull(),
    blobSha: text('blob_sha').notNull(),
    symbolKey: text('symbol_key'),
  },
  (t) => [
    primaryKey({ columns: [t.versionId, t.refId] }),
    index('tutorial_source_refs_path_idx').on(t.path),
  ],
)

export const generationJobs = pgTable(
  'generation_jobs',
  {
    id: id(),
    userId: ownerId(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => repoSnapshots.id),
    tutorialId: uuid('tutorial_id').references(() => tutorials.id, { onDelete: 'set null' }),
    kind: text('kind').$type<'generate'>().notNull(),
    status: jobStatus('status').notNull().default('queued'),
    stage: text('stage').$type<Stage>(),
    progress: integer('progress').notNull().default(0),
    audience: text('audience').$type<Audience>().notNull().default('intermediate'),
    idempotencyKey: text('idempotency_key').notNull(),
    keyId: uuid('key_id').references(() => providerKeys.id, { onDelete: 'set null' }),
    models: jsonb('models').$type<ModelPlan>().notNull(),
    budgetMicros: bigint('budget_micros', { mode: 'number' }).notNull(),
    spentMicros: bigint('spent_micros', { mode: 'number' }).notNull().default(0),
    attempts: integer('attempts').notNull().default(0),
    heartbeatAt: ts('heartbeat_at'),
    errorCode: text('error_code'),
    errorDetail: jsonb('error_detail').$type<ErrorDetail>(),
    createdAt: createdAt(),
    finishedAt: ts('finished_at'),
  },
  (t) => [
    uniqueIndex('generation_jobs_user_idem_idx').on(t.userId, t.idempotencyKey),
    index('generation_jobs_status_heartbeat_idx').on(t.status, t.heartbeatAt),
    index('generation_jobs_user_created_idx').on(t.userId, t.createdAt.desc()),
  ],
)

export const jobStages = pgTable(
  'job_stages',
  {
    jobId: uuid('job_id')
      .notNull()
      .references(() => generationJobs.id, { onDelete: 'cascade' }),
    stage: text('stage').$type<Stage>().notNull(),
    status: text('status').$type<'completed'>().notNull(),
    attempt: integer('attempt').notNull().default(1),
    finishedAt: ts('finished_at'),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.stage] })],
)

export const jobStageOutputs = pgTable(
  'job_stage_outputs',
  {
    jobId: uuid('job_id')
      .notNull()
      .references(() => generationJobs.id, { onDelete: 'cascade' }),
    stage: text('stage').$type<Stage>().notNull(),
    unit: text('unit').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.jobId, t.stage, t.unit] })],
)

export const jobEvents = pgTable(
  'job_events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => generationJobs.id, { onDelete: 'cascade' }),
    type: text('type').$type<JobEventType>().notNull(),
    stage: text('stage').$type<Stage>(),
    data: jsonb('data').$type<JobEventData>(),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('job_events_job_id_idx').on(t.jobId, t.id)],
)

export const llmCalls = pgTable(
  'llm_calls',
  {
    id: id(),
    jobId: uuid('job_id')
      .notNull()
      .references(() => generationJobs.id, { onDelete: 'cascade' }),
    stage: text('stage').notNull(),
    provider: provider('provider').notNull(),
    model: text('model').notNull(),
    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    costMicros: bigint('cost_micros', { mode: 'number' }).notNull().default(0),
    latencyMs: integer('latency_ms').notNull().default(0),
    status: text('status').notNull().default('ok'),
    createdAt: createdAt(),
  },
  (t) => [index('llm_calls_job_idx').on(t.jobId), index('llm_calls_created_idx').on(t.createdAt)],
)

export const learningProgress = pgTable(
  'learning_progress',
  {
    userId: ownerId(),
    tutorialId: uuid('tutorial_id')
      .notNull()
      .references(() => tutorials.id, { onDelete: 'cascade' }),
    versionId: uuid('version_id')
      .notNull()
      .references(() => tutorialVersions.id, { onDelete: 'cascade' }),
    lessonKey: text('lesson_key').notNull(),
    status: lessonStatus('status').notNull(),
    completedAt: ts('completed_at'),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.versionId, t.lessonKey] }),
    index('learning_progress_user_tutorial_idx').on(t.userId, t.tutorialId),
  ],
)

export const quizAttempts = pgTable(
  'quiz_attempts',
  {
    id: id(),
    userId: ownerId(),
    versionId: uuid('version_id')
      .notNull()
      .references(() => tutorialVersions.id, { onDelete: 'cascade' }),
    questionKey: text('question_key').notNull(),
    choiceKey: text('choice_key').notNull(),
    correct: boolean('correct').notNull(),
    at: ts('at').notNull().defaultNow(),
  },
  (t) => [index('quiz_attempts_user_version_idx').on(t.userId, t.versionId)],
)

export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: id(),
    source: text('source').notNull(),
    deliveryId: text('delivery_id').notNull(),
    event: text('event').notNull(),
    receivedAt: ts('received_at').notNull().defaultNow(),
    processedAt: ts('processed_at'),
  },
  (t) => [uniqueIndex('webhook_deliveries_source_delivery_idx').on(t.source, t.deliveryId)],
)

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    userId: ownerId(),
    kind: text('kind').$type<NotificationKind>().notNull(),
    title: text('title').notNull(),
    body: text('body'),
    link: text('link'),
    jobId: uuid('job_id').references(() => generationJobs.id, { onDelete: 'set null' }),
    readAt: ts('read_at'),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_created_idx').on(t.userId, t.createdAt.desc())],
)

export const tutorialReports = pgTable(
  'tutorial_reports',
  {
    id: id(),
    tutorialId: uuid('tutorial_id')
      .notNull()
      .references(() => tutorials.id, { onDelete: 'cascade' }),
    reporterId: text('reporter_id').references(() => user.id, { onDelete: 'set null' }),
    reason: text('reason').notNull(),
    status: text('status').$type<'open' | 'actioned' | 'dismissed'>().notNull().default('open'),
    createdAt: createdAt(),
  },
  (t) => [index('tutorial_reports_tutorial_idx').on(t.tutorialId)],
)

export const operators = pgTable('operators', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  grantedAt: ts('granted_at').notNull().defaultNow(),
})

export const repoPushEvents = pgTable(
  'repo_push_events',
  {
    id: id(),
    repositoryId: uuid('repository_id')
      .notNull()
      .references(() => repositories.id, { onDelete: 'cascade' }),
    commitSha: text('commit_sha').notNull(),
    paths: text('paths').array().notNull(),
    pushedAt: ts('pushed_at').notNull(),
  },
  (t) => [index('repo_push_events_repo_pushed_idx').on(t.repositoryId, t.pushedAt)],
)

export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  theme: text('theme').$type<Theme>().notNull().default('light'),
  defaultAudience: text('default_audience').$type<Audience>().notNull().default('intermediate'),
  autoAdvance: boolean('auto_advance').notNull().default(true),
  quizzesEnabled: boolean('quizzes_enabled').notNull().default(true),
  browserNotifications: boolean('browser_notifications').notNull().default(false),
})
