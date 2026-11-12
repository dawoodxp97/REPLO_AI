import type { FastifyReply, FastifyRequest } from 'fastify'
import type { DashboardService } from './modules/dashboard/dashboard.service'
import type { JobService } from './modules/jobs/jobs.service'
import type { GithubService } from './modules/github/github.service'
import type { AccountService } from './modules/account/account.service'
import type { AuthService } from './modules/identity/auth.service'
import type { SessionUser } from './modules/identity/auth.types'
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
import type { TutorialCatalog } from './modules/tutorials/catalog.service'
import type { TutorialContentService } from './modules/tutorials/content.service'
import type { TutorialManager } from './modules/tutorials/manager.service'
import type { SessionCookie } from './modules/identity/session'
import { sessionFromRequest } from './modules/identity/session-request'

export interface Services {
  auth: AuthService
  account: AccountService
  identity: IdentityService
  github: GithubService
  repositoryLibrary: RepositoryLibrary
  repositoryImports: RepositoryImports
  jobs: JobService
  keys: KeysService
  models: ModelsService
  tutorialCatalog: TutorialCatalog
  tutorialContent: TutorialContentService
  tutorialManager: TutorialManager
  learning: LearningService
  settings: SettingsService
  notifications: NotificationsService
  dashboard: DashboardService
  search: SearchService
  operator: OperatorService
}

export type { SessionUser }

export interface RequestContext {
  user: SessionUser | null
  sessionId: string | null
  setSessionToken(token: string | null): void
  services: Services
  idempotencyKey: string | undefined
  requestId: string
}

export interface RequestContextDeps {
  services: Services
  sessionCookie: Pick<SessionCookie, 'issue' | 'clear'>
}

export async function buildRequestContext(
  request: FastifyRequest,
  reply: FastifyReply,
  deps: RequestContextDeps,
): Promise<RequestContext> {
  const session = await sessionFromRequest(deps.services.auth, request)
  const idempotencyKey = request.headers['idempotency-key']
  return {
    user: session?.user ?? null,
    sessionId: session?.sessionId ?? null,
    setSessionToken: (token) =>
      reply.header(
        'set-cookie',
        token === null ? deps.sessionCookie.clear() : deps.sessionCookie.issue(token),
      ),
    services: deps.services,
    idempotencyKey: typeof idempotencyKey === 'string' ? idempotencyKey : undefined,
    requestId: request.id,
  }
}
