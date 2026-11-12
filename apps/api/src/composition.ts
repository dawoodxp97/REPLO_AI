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
import {
  createDashboardService,
  type DashboardService,
} from './modules/dashboard/dashboard.service'
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
import { createOperatorService, type OperatorService } from './modules/operator/operator.service'
import { createPipelineService, type PipelineService } from './modules/pipeline/pipeline.service'
import {
  createRepositoryChanges,
  type RepositoryChanges,
} from './modules/repositories/changes.service'
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
import { createTutorialCatalog, type TutorialCatalog } from './modules/tutorials/catalog.service'
import {
  createTutorialContent,
  type TutorialContentService,
} from './modules/tutorials/content.service'
import { createTutorialManager, type TutorialManager } from './modules/tutorials/manager.service'
import {
  createTutorialPublisher,
  type TutorialPublisher,
} from './modules/tutorials/publisher.service'
import { createVersionAccess } from './modules/tutorials/version-access.service'

export interface DomainServices {
  identity: IdentityService
  account: AccountService
  sessions: SessionService
  github: GithubService
  indexing: IndexingService
  repositoryLibrary: RepositoryLibrary
  repositoryImports: RepositoryImports
  repositoryChanges: RepositoryChanges
  jobs: JobService
  jobRuntime: JobRuntime
  jobHistory: JobHistory
  keys: KeysService
  models: ModelsService
  tutorialPublisher: TutorialPublisher
  tutorialCatalog: TutorialCatalog
  tutorialContent: TutorialContentService
  tutorialManager: TutorialManager
  learning: LearningService
  pipeline: PipelineService
  notifications: NotificationsService
  settings: SettingsService
  dashboard: DashboardService
  search: SearchService
  operator: OperatorService
  retention: RetentionService
}

export const vaultFrom = (config: Config) =>
  KeyVault.fromEnv(config.KEY_ENCRYPTION_KEY, config.KEY_ENCRYPTION_KEY_VERSION)

export function createDomainServices(deps: {
  config: Config
  db: Db
  queue: JobQueue
  vault: KeyVault
}): DomainServices {
  const { config, db, queue, vault } = deps
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
  const learning = createLearningService({ db, tutorials: versionAccess })
  const tutorialCatalog = createTutorialCatalog({ db, learning })
  const tutorialContent = createTutorialContent({ db, indexing, versionAccess, learning })
  const tutorialManager = createTutorialManager({
    db,
    catalog: tutorialCatalog,
    productOrigin: config.PRODUCT_ORIGIN,
  })
  const account = createAccountService({ db, identity, tutorials: tutorialManager })
  const tutorialPublisher = createTutorialPublisher(db)
  const repositoryLibrary = createRepositoryLibrary({
    db,
    jobs: jobHistory,
    tutorials: tutorialManager,
  })
  const jobs = createJobService({
    db,
    queue,
    indexing,
    notifications,
    tutorials: versionAccess,
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
    tutorials: tutorialPublisher,
  })
  const repositoryImports = createRepositoryImports({
    db,
    preflight: createPreflight({ rest, installations: github, limits }),
    jobs,
    indexing,
    keys,
    models,
    defaults: {
      budgetUsd: config.DEFAULT_BYOK_JOB_BUDGET_USD,
      litePipelineMaxFiles: config.MAX_LITE_PIPELINE_FILES,
    },
  })

  return {
    identity,
    account,
    sessions,
    github,
    indexing,
    repositoryLibrary,
    repositoryImports,
    repositoryChanges: createRepositoryChanges(tutorialManager),
    jobs,
    jobRuntime,
    jobHistory,
    keys,
    models,
    tutorialPublisher,
    tutorialCatalog,
    tutorialContent,
    tutorialManager,
    learning,
    pipeline,
    notifications,
    settings: createSettingsService({ db }),
    dashboard: createDashboardService({
      tutorials: tutorialCatalog,
      jobs: jobHistory,
      learning,
      repositories: repositoryLibrary,
    }),
    search: createSearchService({ tutorials: tutorialCatalog, repositories: repositoryLibrary }),
    operator: createOperatorService({ db, jobs: jobHistory }),
    retention: createRetentionService({
      jobs: jobHistory,
      indexing,
      tutorials: tutorialManager,
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
