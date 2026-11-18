import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createKeyChecker, loadCatalog, MODEL_CATALOG } from '@replo/ai'
import { DEFAULT_EXTRACTION_LIMITS } from '@replo/repo-analysis'
import type { Services } from './request-context'
import { createAccountService, type AccountService } from './modules/account/account.service'
import { KeyVault } from './platform/crypto/key-vault'
import type { Config } from './platform/config'
import type { Db } from './platform/db/client'
import { createGithubRest } from './platform/github/client'
import type { JobQueue } from './platform/queue/job-queue'
import { createJobHistory, type JobHistory } from './modules/jobs/job-history.service'
import { createJobRuntime, type JobRuntime } from './modules/jobs/job-runtime.service'
import { createJobService, type JobService } from './modules/jobs/jobs.service'
import { createGithubService, type GithubService } from './modules/github/github.service'
import { githubAppFrom } from './modules/github/github.app'
import { createAuthService, type AuthService } from './modules/identity/auth.service'
import { createIdentityService, type IdentityService } from './modules/identity/identity.service'
import type { OAuthClients } from './modules/identity/oauth'
import { createSessionService, type SessionService } from './modules/identity/session.service'
import { createIndexingService, type IndexingService } from './modules/indexing/indexing.service'
import { createKeysService, type KeysService } from './modules/keys/keys.service'
import { createLearningService, type LearningService } from './modules/learning/learning.service'
import { createModelsService, type ModelsService } from './modules/models/models.service'
import {
  createNotificationsService,
  type NotificationsService,
} from './modules/notifications/notifications.service'
import { createAdminService, type AdminService } from './modules/admin/admin.service'
import { createAdminSeeder, type AdminSeeder } from './modules/admin/admin-seed'
import type PgBoss from 'pg-boss'
import { createPipelineService, type PipelineService } from './modules/pipeline/pipeline.service'
import {
  createRepositoryImports,
  type RepositoryImports,
} from './modules/repositories/imports.service'
import {
  createRepositoryLibrary,
  type RepositoryLibrary,
} from './modules/repositories/library.service'
import { createPreflight } from './modules/repositories/preflight'
import { createRepositorySources } from './modules/repositories/sources.service'
import {
  createRetentionService,
  type RetentionService,
} from './modules/retention/retention.service'
import { createSearchService, type SearchService } from './modules/search/search.service'
import { createSettingsService, type SettingsService } from './modules/settings/settings.service'
import { createCourseCatalog, type CourseCatalog } from './modules/courses/catalog.service'
import { createCourseContent, type CourseContentService } from './modules/courses/content.service'
import { createCourseManager, type CourseManager } from './modules/courses/manager.service'
import { createCoursePublisher, type CoursePublisher } from './modules/courses/publisher.service'
import { createVersionAccess } from './modules/courses/version-access.service'
import {
  createDashboardService,
  type DashboardService,
} from './modules/dashboard/dashboard.service'
import {
  createAnalyticsService,
  type AnalyticsService,
} from './modules/dashboard/analytics.service'
import {
  createWorkspaceService,
  type WorkspaceService,
} from './modules/workspace/workspace.service'
import { analyticsRepo } from './modules/analytics/analytics.repo'

export interface DomainServices {
  identity: IdentityService
  account: AccountService
  sessions: SessionService
  github: GithubService
  indexing: IndexingService
  repositoryLibrary: RepositoryLibrary
  repositoryImports: RepositoryImports
  jobs: JobService
  jobRuntime: JobRuntime
  jobHistory: JobHistory
  keys: KeysService
  models: ModelsService
  coursePublisher: CoursePublisher
  courseCatalog: CourseCatalog
  courseContent: CourseContentService
  courseManager: CourseManager
  learning: LearningService
  pipeline: PipelineService
  notifications: NotificationsService
  settings: SettingsService
  dashboard: DashboardService
  search: SearchService
  workspace: WorkspaceService
  analytics: AnalyticsService
  admin: AdminService
  adminSeed: AdminSeeder
  retention: RetentionService
}

export const vaultFrom = (config: Config) =>
  KeyVault.fromEnv(config.KEY_ENCRYPTION_KEY, config.KEY_ENCRYPTION_KEY_VERSION)

export function createDomainServices(deps: {
  config: Config
  db: Db
  queue: JobQueue
  vault: KeyVault
  boss: PgBoss
}): DomainServices {
  const { config, db, queue, vault, boss } = deps
  const rest = createGithubRest()
  const limits = { maxFiles: config.MAX_REPO_FILES, maxBytes: config.MAX_REPO_BYTES }
  const identity = createIdentityService({ db, vault })
  const sessions = createSessionService(db)
  const github = createGithubService({
    db,
    rest,
    app: githubAppFrom(config),
    userTokens: identity,
  })
  const notifications = createNotificationsService(db)
  const jobHistory = createJobHistory(db)
  const analyticsEvents = analyticsRepo(db)
  const jobRuntime = createJobRuntime({ db, queue, notifications })
  const indexing = createIndexingService({
    db,
    rest,
    tokens: github,
    sources: createRepositorySources(db),
    limits,
    extraction: DEFAULT_EXTRACTION_LIMITS,
    snapshotRoot: config.SNAPSHOT_DIR ?? join(tmpdir(), 'replo-snapshots'),
  })
  const versionAccess = createVersionAccess(db)
  const catalog = loadCatalog(MODEL_CATALOG)
  const models = createModelsService({ db, catalog })
  const learning = createLearningService({ db, courses: versionAccess, analytics: analyticsEvents })
  const courseCatalog = createCourseCatalog({ db, learning })
  const courseContent = createCourseContent({ db, indexing, versionAccess, learning })
  const courseManager = createCourseManager({ db })
  const account = createAccountService({ db, identity, courses: courseManager })
  const coursePublisher = createCoursePublisher(db)
  const repositoryLibrary = createRepositoryLibrary({
    db,
    jobs: jobHistory,
    courses: courseManager,
  })
  const jobs = createJobService({
    db,
    queue,
    indexing,
    notifications,
    courses: versionAccess,
    repositories: repositoryLibrary,
  })
  const keys = createKeysService({
    db,
    vault,
    checker: createKeyChecker(),
    jobs,
  })
  const pipeline = createPipelineService({
    db,
    indexing,
    keys,
    catalog,
    jobs,
    courses: coursePublisher,
    liteMaxFiles: config.MAX_LITE_PIPELINE_FILES,
  })
  const repositoryImports = createRepositoryImports({
    db,
    preflight: createPreflight({ rest, installations: github, limits }),
    jobs,
    indexing,
    keys,
    models,
    repositories: repositoryLibrary,
  })

  const workspace = createWorkspaceService({ db, courses: versionAccess, indexing })
  const analytics = createAnalyticsService(db)

  return {
    identity,
    account,
    sessions,
    github,
    indexing,
    repositoryLibrary,
    repositoryImports,
    jobs,
    jobRuntime,
    jobHistory,
    keys,
    models,
    coursePublisher,
    courseCatalog,
    courseContent,
    courseManager,
    learning,
    pipeline,
    notifications,
    settings: createSettingsService({ db }),
    dashboard: createDashboardService({
      courses: courseCatalog,
      jobs: jobHistory,
      learning,
      repositories: repositoryLibrary,
    }),
    search: createSearchService({
      courses: courseCatalog,
      repositories: repositoryLibrary,
      dashboards: analytics,
    }),
    workspace,
    analytics,
    admin: createAdminService({ db, jobs: jobHistory, boss }),
    adminSeed: createAdminSeeder(db),
    retention: createRetentionService({
      jobs: jobHistory,
      indexing,
      notifications,
      sessions,
    }),
  }
}

export function createServices(deps: {
  config: Config
  db: Db
  domain: DomainServices
  oauth: OAuthClients
  vault: KeyVault
}): Services {
  const { db, domain, oauth, vault } = deps
  const auth: AuthService = createAuthService({
    db,
    vault,
    sessions: domain.sessions,
    enabled: { google: oauth.google !== undefined, github: oauth.github !== undefined },
  })
  return { ...domain, auth }
}
