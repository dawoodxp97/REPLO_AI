import { z } from 'zod'
import type { IdentityService } from '../identity/identity.service'
import type { AuthService } from '../identity/auth.service'
import { sessionFromRequest } from '../identity/session-request'
import { GithubApiError } from '../../platform/github/client'
import type { App } from '../../platform/http'
import type { GithubService, LinkOutcome } from './github.service'

const SetupQuery = z.object({ installation_id: z.coerce.number().int().positive() })

type SetupStatus = LinkOutcome | 'invalid' | 'github_not_linked' | 'error'

const REJECTED_TOKEN_STATUSES = new Set([401, 403])

const isNetworkFailure = (error: unknown) =>
  error instanceof TypeError && error.message === 'fetch failed'

const statusForFailure = (error: unknown): SetupStatus => {
  if (error instanceof GithubApiError)
    return REJECTED_TOKEN_STATUSES.has(error.status) ? 'github_not_linked' : 'error'
  if (isNetworkFailure(error)) return 'error'
  throw error
}

export function registerGithubSetup(
  app: App,
  deps: {
    auth: AuthService
    identity: IdentityService
    github: GithubService
    productOrigin: string
  },
) {
  const redirectTo = (status: SetupStatus) =>
    `${deps.productOrigin}/import?github=${encodeURIComponent(status)}`

  const link = async (userId: string, installationId: number): Promise<SetupStatus> => {
    const userToken = await deps.identity.githubAccessToken(userId)
    if (!userToken) return 'github_not_linked'
    try {
      return await deps.github.linkInstallation({ userId, installationId, userToken })
    } catch (error) {
      return statusForFailure(error)
    }
  }

  app.get('/github/setup', async (request, reply) => {
    const session = await sessionFromRequest(deps.auth, request)
    if (!session) return reply.redirect(`${deps.productOrigin}/login`)

    const query = SetupQuery.safeParse(request.query)
    if (!query.success) return reply.redirect(redirectTo('invalid'))

    return reply.redirect(redirectTo(await link(session.user.id, query.data.installation_id)))
  })
}
