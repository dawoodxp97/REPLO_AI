import Fastify from 'fastify'
import { describe, expect, it, vi } from 'vitest'
import { createLogger } from '../../platform/logger'
import { registerAuthRoutes } from './auth.route'
import type { AuthService } from './auth.service'
import { OAuthFailure, type OAuthClient, type OAuthGrant } from './oauth'
import { createSessionCookie } from './session'

const productOrigin = 'https://app.replo.test'
const apiPublicUrl = 'https://api.replo.test'
const ATTEMPT = 'replo_oauth'

const grant: OAuthGrant = {
  accessToken: 'gho_token',
  profile: {
    providerAccountId: '42',
    email: 'ada@example.com',
    emailVerified: true,
    name: 'Ada',
    image: null,
  },
}

const issued = {
  token: 'session-token',
  sessionId: 'session-1',
  user: { id: 'user-1', name: 'Ada', email: 'ada@example.com', image: null },
}

function buildApp(
  overrides: { complete?: OAuthClient['complete']; auth?: Partial<AuthService> } = {},
) {
  const client: OAuthClient = {
    provider: 'github',
    authorizationUrl: ({ redirectUri, state, codeChallenge }) =>
      `https://github.test/authorize?redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&code_challenge=${codeChallenge}`,
    complete: vi.fn(overrides.complete ?? (async () => grant)),
  }
  const auth = {
    currentSession: vi.fn(async () => null),
    signInWithProvider: vi.fn(async () => ({ kind: 'ok' as const, value: issued })),
    linkProvider: vi.fn(async () => ({ kind: 'ok' as const, value: true as const })),
    ...overrides.auth,
  }
  const app = Fastify({ loggerInstance: createLogger({ level: 'silent', name: 'test' }) })
  registerAuthRoutes(app, {
    auth: auth as unknown as AuthService,
    clients: { github: client },
    sessionCookie: createSessionCookie({ secure: false, domain: undefined }),
    productOrigin,
    apiPublicUrl,
    secure: false,
  })
  return { app, client, auth }
}

const cookieValue = (setCookie: string | string[] | undefined, name: string) => {
  const cookies = ([] as string[]).concat(setCookie ?? [])
  const match = cookies.find((cookie) => cookie.startsWith(`${name}=`))
  return match?.split(';')[0]?.slice(name.length + 1)
}

async function startFlow(app: ReturnType<typeof Fastify>, headers: Record<string, string> = {}) {
  const res = await app.inject({ method: 'GET', url: '/auth/github/start', headers })
  const location = new URL(String(res.headers.location))
  const attempt = cookieValue(res.headers['set-cookie'], ATTEMPT)
  return {
    res,
    state: location.searchParams.get('state') ?? '',
    attempt: attempt ?? '',
  }
}

const callback = (app: ReturnType<typeof Fastify>, query: string, attempt?: string) =>
  app.inject({
    method: 'GET',
    url: `/auth/github/callback?${query}`,
    headers: attempt ? { cookie: `${ATTEMPT}=${attempt}` } : {},
  })

describe('OAuth start', () => {
  it('redirects to the provider with a state and PKCE challenge, and keeps the verifier in a short-lived httpOnly cookie', async () => {
    const { app } = buildApp()
    const { res, state, attempt } = await startFlow(app)

    expect(res.statusCode).toBe(302)
    expect(String(res.headers.location)).toContain(
      `redirect_uri=${encodeURIComponent(`${apiPublicUrl}/auth/github/callback`)}`,
    )
    expect(state).not.toBe('')
    expect(JSON.parse(Buffer.from(attempt, 'base64url').toString('utf8'))).toMatchObject({
      provider: 'github',
      state,
      intent: 'sign-in',
    })
    const setCookie = String(res.headers['set-cookie'])
    expect(setCookie).toContain('Path=/auth')
    expect(setCookie).toContain('Max-Age=600')
    expect(setCookie).toContain('HttpOnly')
  })

  it('redirects to login when a provider is not configured', async () => {
    const { app } = buildApp()
    const res = await app.inject({ method: 'GET', url: '/auth/google/start' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${productOrigin}/login?error=OAUTH_NOT_CONFIGURED`)
  })

  it('sends a linking request without a session back to sign in', async () => {
    const { app } = buildApp()
    const res = await app.inject({ method: 'GET', url: '/auth/github/start?intent=link' })
    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${productOrigin}/login`)
  })
})

describe('OAuth callback', () => {
  it('signs the user in, sets the session cookie and clears the attempt', async () => {
    const { app, client, auth } = buildApp()
    const { state, attempt } = await startFlow(app)

    const res = await callback(app, `code=the-code&state=${state}`, attempt)

    expect(res.statusCode).toBe(302)
    expect(res.headers.location).toBe(`${productOrigin}/`)
    expect(client.complete).toHaveBeenCalledWith({
      redirectUri: `${apiPublicUrl}/auth/github/callback`,
      code: 'the-code',
      codeVerifier: expect.any(String),
    })
    expect(auth.signInWithProvider).toHaveBeenCalledWith({ provider: 'github', ...grant })
    const cookies = ([] as string[]).concat(res.headers['set-cookie'] ?? [])
    expect(cookies.some((cookie) => cookie.startsWith('replo_session=session-token;'))).toBe(true)
    expect(
      cookies.some((cookie) => cookie.startsWith(`${ATTEMPT}=;`) && cookie.includes('Max-Age=0')),
    ).toBe(true)
  })

  it('refuses a state that does not match the one the attempt cookie holds', async () => {
    const { app, client, auth } = buildApp()
    const { attempt } = await startFlow(app)

    const res = await callback(app, 'code=the-code&state=forged', attempt)

    expect(res.headers.location).toBe(`${productOrigin}/login?error=OAUTH_STATE`)
    expect(client.complete).not.toHaveBeenCalled()
    expect(auth.signInWithProvider).not.toHaveBeenCalled()
  })

  it('refuses a callback that has no attempt cookie', async () => {
    const { app, auth } = buildApp()
    await startFlow(app)

    const res = await callback(app, 'code=the-code&state=anything')

    expect(res.headers.location).toBe(`${productOrigin}/login?error=OAUTH_STATE`)
    expect(auth.signInWithProvider).not.toHaveBeenCalled()
  })

  it('reports a denied consent from the provider', async () => {
    const { app } = buildApp()
    const { attempt, state } = await startFlow(app)
    const res = await callback(app, `error=access_denied&state=${state}`, attempt)
    expect(res.headers.location).toBe(`${productOrigin}/login?error=OAUTH_DENIED`)
  })

  it('reports a failed token exchange without leaking the provider error', async () => {
    const { app } = buildApp({
      complete: async () => {
        throw new OAuthFailure('token endpoint responded 400')
      },
    })
    const { attempt, state } = await startFlow(app)
    const res = await callback(app, `code=c&state=${state}`, attempt)
    expect(res.headers.location).toBe(`${productOrigin}/login?error=OAUTH_FAILED`)
  })

  it('sends a refused sign-in back to the login page with the refusal code and no session', async () => {
    const { app } = buildApp({
      auth: {
        signInWithProvider: vi.fn(async () => ({
          kind: 'refused' as const,
          refusal: 'ACCOUNT_EXISTS' as const,
        })),
      },
    })
    const { attempt, state } = await startFlow(app)
    const res = await callback(app, `code=c&state=${state}`, attempt)
    expect(res.headers.location).toBe(`${productOrigin}/login?error=ACCOUNT_EXISTS`)
    expect(cookieValue(res.headers['set-cookie'], 'replo_session')).toBeUndefined()
  })

  it('links the provider to the signed-in user when the attempt was a link', async () => {
    const { app, auth } = buildApp({
      auth: {
        currentSession: vi.fn(async () => ({ sessionId: 'session-1', user: issued.user })),
      },
    })
    const started = await app.inject({
      method: 'GET',
      url: '/auth/github/start?intent=link',
      headers: { cookie: 'replo_session=session-token' },
    })
    const state = new URL(String(started.headers.location)).searchParams.get('state') ?? ''
    const attempt = cookieValue(started.headers['set-cookie'], ATTEMPT) ?? ''

    const res = await callback(app, `code=c&state=${state}`, attempt)

    expect(auth.linkProvider).toHaveBeenCalledWith({
      userId: 'user-1',
      provider: 'github',
      ...grant,
    })
    expect(auth.signInWithProvider).not.toHaveBeenCalled()
    expect(res.headers.location).toBe(`${productOrigin}/settings/profile?linked=github`)
  })

  it('shows a refused link on the profile settings page', async () => {
    const { app } = buildApp({
      auth: {
        currentSession: vi.fn(async () => ({ sessionId: 'session-1', user: issued.user })),
        linkProvider: vi.fn(async () => ({
          kind: 'refused' as const,
          refusal: 'IDENTITY_IN_USE' as const,
        })),
      },
    })
    const started = await app.inject({
      method: 'GET',
      url: '/auth/github/start?intent=link',
      headers: { cookie: 'replo_session=session-token' },
    })
    const state = new URL(String(started.headers.location)).searchParams.get('state') ?? ''
    const attempt = cookieValue(started.headers['set-cookie'], ATTEMPT) ?? ''

    const res = await callback(app, `code=c&state=${state}`, attempt)
    expect(res.headers.location).toBe(`${productOrigin}/settings/profile?error=IDENTITY_IN_USE`)
  })
})
