import { OAuthProvider } from '@replo/contracts'
import { z } from 'zod'
import { serializeCookie } from '../../platform/cookies'
import type { App } from '../../platform/http'
import type { AuthService } from './auth.service'
import { newOAuthAttempt, OAuthFailure, type OAuthClients, type OAuthGrant } from './oauth'
import { ATTEMPT_COOKIE, AuthIntent, encodeAttempt, readAttempt } from './oauth-attempt'
import { sessionFromRequest } from './session-request'
import type { SessionCookie } from './session'

const ATTEMPT_PATH = '/auth'
const ATTEMPT_LIFETIME_SECONDS = 600

const ProviderParams = z.object({ provider: OAuthProvider })
const StartQuery = z.object({ intent: AuthIntent.default('sign-in') })
const CallbackQuery = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().optional(),
})
export interface AuthRouteDeps {
  auth: AuthService
  clients: OAuthClients
  sessionCookie: SessionCookie
  productOrigin: string
  apiPublicUrl: string
  secure: boolean
}

export function registerAuthRoutes(app: App, deps: AuthRouteDeps) {
  const attemptCookie = (value: string, maxAgeSeconds: number) =>
    serializeCookie(ATTEMPT_COOKIE, value, {
      httpOnly: true,
      secure: deps.secure,
      sameSite: 'Lax',
      path: ATTEMPT_PATH,
      maxAgeSeconds,
    })

  const redirects = createAuthRedirects(deps)
  const { login: loginUrl, settings: settingsUrl, product: productUrl } = redirects
  const callbackUrl = redirects.callback

  app.get('/auth/:provider/start', async (request, reply) => {
    const params = ProviderParams.safeParse(request.params)
    const query = StartQuery.safeParse(request.query)
    const client = params.success ? deps.clients[params.data.provider] : undefined
    if (!params.success || !query.success) return reply.code(404).send()
    if (!client) return reply.redirect(loginUrl('OAUTH_NOT_CONFIGURED'))

    if (query.data.intent === 'link' && !(await sessionFromRequest(deps.auth, request)))
      return reply.redirect(loginUrl())

    const attempt = newOAuthAttempt()
    const encoded = encodeAttempt({
      provider: params.data.provider,
      state: attempt.state,
      codeVerifier: attempt.codeVerifier,
      intent: query.data.intent,
    })
    reply.header('set-cookie', attemptCookie(encoded, ATTEMPT_LIFETIME_SECONDS))
    return reply.redirect(
      client.authorizationUrl({
        redirectUri: callbackUrl(params.data.provider),
        state: attempt.state,
        codeChallenge: attempt.codeChallenge,
      }),
    )
  })

  app.get('/auth/:provider/callback', async (request, reply) => {
    const params = ProviderParams.safeParse(request.params)
    const client = params.success ? deps.clients[params.data.provider] : undefined
    if (!params.success || !client) return reply.code(404).send()
    const provider = params.data.provider

    const attempt = readAttempt(request.headers.cookie)
    const cleared = attemptCookie('', 0)
    const finish = (location: string, cookies: string[] = []) => {
      reply.header('set-cookie', [cleared, ...cookies])
      return reply.redirect(location)
    }
    const fail = (error: string) =>
      finish(attempt?.intent === 'link' ? settingsUrl(error) : loginUrl(error))

    const query = CallbackQuery.safeParse(request.query)
    if (query.success && query.data.error) return fail('OAUTH_DENIED')
    if (
      !attempt ||
      attempt.provider !== provider ||
      !query.success ||
      !query.data.code ||
      query.data.state !== attempt.state
    )
      return fail('OAUTH_STATE')

    let grant: OAuthGrant
    try {
      grant = await client.complete({
        redirectUri: callbackUrl(provider),
        code: query.data.code,
        codeVerifier: attempt.codeVerifier,
      })
    } catch (error) {
      if (error instanceof OAuthFailure) return fail('OAUTH_FAILED')
      throw error
    }

    if (attempt.intent === 'link') {
      const current = await sessionFromRequest(deps.auth, request)
      if (!current) return finish(loginUrl())
      const linked = await deps.auth.linkProvider({
        userId: current.user.id,
        provider,
        ...grant,
      })
      if (linked.kind === 'refused') return fail(linked.refusal)
      return finish(productUrl('/settings/profile', { linked: provider }))
    }

    const outcome = await deps.auth.signInWithProvider({ provider, ...grant })
    if (outcome.kind === 'refused') return fail(outcome.refusal)
    return finish(productUrl('/'), [deps.sessionCookie.issue(outcome.value.token)])
  })
}

export function createAuthRedirects(origins: { productOrigin: string; apiPublicUrl: string }) {
  const product = (path: string, params: Record<string, string> = {}) => {
    const url = new URL(path, origins.productOrigin)
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    return url.toString()
  }
  const withError = (error?: string): Record<string, string> => (error ? { error } : {})
  return {
    product,
    login: (error?: string) => product('/login', withError(error)),
    settings: (error?: string) => product('/settings/profile', withError(error)),
    callback: (provider: OAuthProvider) =>
      new URL(`/auth/${provider}/callback`, origins.apiPublicUrl).toString(),
  }
}
