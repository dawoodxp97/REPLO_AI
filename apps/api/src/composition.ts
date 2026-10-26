import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createKeyChecker, loadCatalog, MODEL_CATALOG } from '@replo/ai'
import { DEFAULT_EXTRACTION_LIMITS } from '@replo/repo-analysis'
import type { Services } from './context'
import { KeyVault } from './platform/crypto/key-vault'
import type { Config } from './platform/config'
import type { Db } from './platform/db/client'
import { createGithubRest } from './platform/github/client'
import type { JobQueue } from './platform/queue/job-queue'
import {
  createDashboardService,
  type DashboardService,
} from './modules/dashboard/dashboard.service'
import { createJobHistory, type JobHistory } from './modules/generation/job-history.service'
import { createJobRuntime, type JobRuntime } from './modules/generation/job-runtime.service'
import { createJobService, type JobService } from './modules/generation/jobs.service'
import { createGithubService, type GithubService } from './modules/github/github.service'
import { githubAppFrom } from './modules/github/github.app'
import { createAuthService, type AuthService } from './modules/identity/auth.service'
import { createIdentityService, type IdentityService } from './modules/identity/identity.service'
import type { OAuthClients } from './modules/identity/oauth'
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
import { createTutorialLibrary, type TutorialLibrary } from './modules/tutorials/library.service'
import { createTutorialManager, type TutorialManager } from './modules/tutorials/manager.service'
import {
  createTutorialPublisher,
  type TutorialPublisher,
} from './modules/tutorials/publisher.service'
import { createTutorialReader } from './modules/tutorials/reader.service'

export interface DomainServices {
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
  tutorialLibrary: TutorialLibrary
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

export function createDomainServices(deps: {
  config: Config
  db: Db
  queue: JobQueue
}): DomainServices {
  const { config, db, queue } = deps
  const rest = createGithubRest()
  const limits = { maxFiles: config.MAX_REPO_FILES, maxBytes: config.MAX_REPO_BYTES }
  const github = createGithubService({ db, rest, app: githubAppFrom(config) })
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
  const jobs = createJobService({ db, queue, indexing, notifications })
  const keys = createKeysService({
    db,
    vault: KeyVault.fromEnv(config.KEY_ENCRYPTION_KEY, config.KEY_ENCRYPTION_KEY_VERSION),
    checker: createKeyChecker(),
    jobs,
  })
  const catalog = loadCatalog(MODEL_CATALOG)
  const models = createModelsService({ db, catalog })
  const tutorialReader = createTutorialReader(db)
  const learning = createLearningService({ db, tutorials: tutorialReader })
  const tutorialLibrary = createTutorialLibrary({
    db,
    indexing,
    reader: tutorialReader,
    learning,
  })
  const tutorialManager = createTutorialManager({
    db,
    library: tutorialLibrary,
    productOrigin: config.PRODUCT_ORIGIN,
  })
  const tutorialPublisher = createTutorialPublisher(db)
  const repositoryLibrary = createRepositoryLibrary({
    db,
    jobs: jobHistory,
    tutorials: tutorialManager,
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
    tutorialLibrary,
    tutorialManager,
    learning,
    pipeline,
    notifications,
    settings: createSettingsService({ db }),
    dashboard: createDashboardService({
      tutorials: tutorialLibrary,
      jobs: jobHistory,
      learning,
      repositories: repositoryLibrary,
    }),
    search: createSearchService({ tutorials: tutorialLibrary, repositories: repositoryLibrary }),
    operator: createOperatorService({ db, jobs: jobHistory }),
    retention: createRetentionService({ jobs: jobHistory, pipeline, indexing, notifications }),
  }
}

export function createServices(deps: {
  config: Config
  db: Db
  domain: DomainServices
  oauth: OAuthClients
}): Services {
  const { config, db, domain, oauth } = deps
  const vault = KeyVault.fromEnv(config.KEY_ENCRYPTION_KEY, config.KEY_ENCRYPTION_KEY_VERSION)
  const auth: AuthService = createAuthService({
    db,
    vault,
    enabled: { google: oauth.google !== undefined, github: oauth.github !== undefined },
  })
  const identity: IdentityService = createIdentityService({
    db,
    vault,
    tutorials: domain.tutorialManager,
  })
  return {
    auth,
    identity,
    github: domain.github,
    repositoryLibrary: domain.repositoryLibrary,
    repositoryImports: domain.repositoryImports,
    jobs: domain.jobs,
    keys: domain.keys,
    models: domain.models,
    tutorialLibrary: domain.tutorialLibrary,
    tutorialManager: domain.tutorialManager,
    learning: domain.learning,
    settings: domain.settings,
    notifications: domain.notifications,
    dashboard: domain.dashboard,
    search: domain.search,
    operator: domain.operator,
  }
}
