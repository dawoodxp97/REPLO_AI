import type { DashboardService } from './modules/dashboard/dashboard.service'
import type { JobService } from './modules/generation/jobs.service'
import type { GithubService } from './modules/github/github.service'
import type { AuthService } from './modules/identity/auth.service'
import type { IdentityService } from './modules/identity/identity.service'
import type { KeysService } from './modules/keys/keys.service'
import type { LearningService } from './modules/learning/learning.service'
import type { ModelsService } from './modules/models/models.service'
import type { NotificationsService } from './modules/notifications/notifications.service'
import type { OperatorService } from './modules/operator/operator.service'
import type { RepositoryLibrary } from './modules/repositories/library.service'
import type { RepositoryImports } from './modules/repositories/imports.service'
import type { SearchService } from './modules/search/search.service'
import type { SettingsService } from './modules/settings/settings.service'
import type { TutorialLibrary } from './modules/tutorials/library.service'
import type { TutorialManager } from './modules/tutorials/manager.service'

export interface SessionUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export interface Services {
  auth: AuthService
  identity: IdentityService
  github: GithubService
  repositoryLibrary: RepositoryLibrary
  repositoryImports: RepositoryImports
  jobs: JobService
  keys: KeysService
  models: ModelsService
  tutorialLibrary: TutorialLibrary
  tutorialManager: TutorialManager
  learning: LearningService
  settings: SettingsService
  notifications: NotificationsService
  dashboard: DashboardService
  search: SearchService
  operator: OperatorService
}

export interface RequestContext {
  user: SessionUser | null
  sessionId: string | null
  setSessionToken(token: string | null): void
  services: Services
  idempotencyKey: string | undefined
  requestId: string
}
