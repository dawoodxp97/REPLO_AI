import { z } from 'zod'
import type { IdentityService } from '../identity/identity.service'
import type { AuthService } from '../identity/auth.service'
import { sessionFromRequest } from '../identity/session-request'
import type { App } from '../../platform/http'
import type { GithubService, LinkOutcome } from './github.service'

const SetupQuery = z.object({ installation_id: z.coerce.number().int().positive() })

export function registerGithubSetup(
  app: App,
  deps: {
    auth: AuthService
    identity: IdentityService
    github: GithubService
    productOrigin: string
  },
) {
  const redirectTo = (status: LinkOutcome | 'invalid' | 'github_not_linked') =>
    `${deps.productOrigin}/import?github=${encodeURIComponent(status)}`

  app.get('/github/setup', async (request, reply) => {
    const session = await sessionFromRequest(deps.auth, request)
    if (!session) return reply.redirect(`${deps.productOrigin}/login`)

    const query = SetupQuery.safeParse(request.query)
    if (!query.success) return reply.redirect(redirectTo('invalid'))

    const userToken = await deps.identity.githubAccessToken(session.user.id)
    if (!userToken) return reply.redirect(redirectTo('github_not_linked'))

    const outcome: LinkOutcome = await deps.github.linkInstallation({
      userId: session.user.id,
      installationId: query.data.installation_id,
      userToken,
    })
    return reply.redirect(redirectTo(outcome))
  })
}
