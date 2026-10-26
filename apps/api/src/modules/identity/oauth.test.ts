import { describe, expect, it } from 'vitest'
import {
  codeChallengeFor,
  createOAuthClients,
  githubClient,
  googleClient,
  newOAuthAttempt,
  OAuthFailure,
} from './oauth'

interface Route {
  status?: number
  body: unknown
}

function stubFetch(routes: Record<string, Route>) {
  const calls: { url: string; init?: RequestInit }[] = []
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input)
    calls.push({ url, init })
    const route = routes[url]
    if (!route) throw new Error(`unexpected request to ${url}`)
    return new Response(JSON.stringify(route.body), {
      status: route.status ?? 200,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
  return { impl, calls }
}

const credentials = { clientId: 'client-id', clientSecret: 'client-secret' }
const redirectUri = 'https://api.replo.test/auth/github/callback'

describe('PKCE', () => {
  it('matches the S256 example in RFC 7636 appendix B', () => {
    expect(codeChallengeFor('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk')).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    )
  })

  it('creates a fresh state and a verifier whose challenge matches it', () => {
    const first = newOAuthAttempt()
    const second = newOAuthAttempt()
    expect(first.codeChallenge).toBe(codeChallengeFor(first.codeVerifier))
    expect(first.state).not.toBe(second.state)
    expect(first.codeVerifier).not.toBe(second.codeVerifier)
  })
})

describe('googleClient', () => {
  const client = googleClient(credentials)

  it('sends the user to Google with PKCE and the openid email profile scopes', () => {
    const url = new URL(
      client.authorizationUrl({
        redirectUri: 'https://api.replo.test/auth/google/callback',
        state: 'state-1',
        codeChallenge: 'challenge-1',
      }),
    )
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      client_id: 'client-id',
      response_type: 'code',
      scope: 'openid email profile',
      state: 'state-1',
      code_challenge: 'challenge-1',
      code_challenge_method: 'S256',
    })
  })

  it('exchanges the code and maps a verified Google profile', async () => {
    const { impl, calls } = stubFetch({
      'https://oauth2.googleapis.com/token': { body: { access_token: 'google-token' } },
      'https://openidconnect.googleapis.com/v1/userinfo': {
        body: {
          sub: '1093',
          email: 'Ada@Example.com',
          email_verified: true,
          name: 'Ada',
          picture: 'https://img.replo.test/ada.png',
        },
      },
    })
    const grant = await googleClient(credentials, impl).complete({
      redirectUri: 'https://api.replo.test/auth/google/callback',
      code: 'code-1',
      codeVerifier: 'verifier-1',
    })

    expect(grant).toEqual({
      accessToken: 'google-token',
      profile: {
        providerAccountId: '1093',
        email: 'ada@example.com',
        emailVerified: true,
        name: 'Ada',
        image: 'https://img.replo.test/ada.png',
      },
    })
    const form = new URLSearchParams(String(calls[0]?.init?.body))
    expect(Object.fromEntries(form)).toMatchObject({
      code: 'code-1',
      code_verifier: 'verifier-1',
      client_secret: 'client-secret',
      grant_type: 'authorization_code',
    })
    expect(calls[1]?.init?.headers).toMatchObject({ authorization: 'Bearer google-token' })
  })

  it('does not treat an unverified Google email as verified', async () => {
    const { impl } = stubFetch({
      'https://oauth2.googleapis.com/token': { body: { access_token: 't' } },
      'https://openidconnect.googleapis.com/v1/userinfo': {
        body: { sub: '1', email: 'ada@example.com', email_verified: false },
      },
    })
    const grant = await googleClient(credentials, impl).complete({
      redirectUri,
      code: 'c',
      codeVerifier: 'v',
    })
    expect(grant.profile.emailVerified).toBe(false)
  })

  it('fails with OAuthFailure when the token endpoint refuses the code', async () => {
    const { impl } = stubFetch({
      'https://oauth2.googleapis.com/token': { status: 400, body: { error: 'invalid_grant' } },
    })
    await expect(
      googleClient(credentials, impl).complete({ redirectUri, code: 'c', codeVerifier: 'v' }),
    ).rejects.toBeInstanceOf(OAuthFailure)
  })
})

describe('githubClient', () => {
  const client = githubClient(credentials)

  it('requests read:user and user:email with PKCE', () => {
    const url = new URL(
      client.authorizationUrl({ redirectUri, state: 'state-2', codeChallenge: 'challenge-2' }),
    )
    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize')
    expect(url.searchParams.get('scope')).toBe('read:user user:email')
    expect(url.searchParams.get('code_challenge_method')).toBe('S256')
  })

  it('takes the primary verified email and the numeric account id', async () => {
    const { impl } = stubFetch({
      'https://github.com/login/oauth/access_token': { body: { access_token: 'gho_token' } },
      'https://api.github.com/user': {
        body: { id: 42, login: 'ada', name: null, avatar_url: 'https://avatars.test/42' },
      },
      'https://api.github.com/user/emails': {
        body: [
          { email: 'home@example.com', primary: false, verified: true },
          { email: 'Ada@Example.com', primary: true, verified: true },
        ],
      },
    })
    const grant = await githubClient(credentials, impl).complete({
      redirectUri,
      code: 'c',
      codeVerifier: 'v',
    })
    expect(grant).toEqual({
      accessToken: 'gho_token',
      profile: {
        providerAccountId: '42',
        email: 'ada@example.com',
        emailVerified: true,
        name: 'ada',
        image: 'https://avatars.test/42',
      },
    })
  })

  it('reports no verified email when the primary address is unverified', async () => {
    const { impl } = stubFetch({
      'https://github.com/login/oauth/access_token': { body: { access_token: 'gho_token' } },
      'https://api.github.com/user': { body: { id: 7, login: 'bo' } },
      'https://api.github.com/user/emails': {
        body: [{ email: 'bo@example.com', primary: true, verified: false }],
      },
    })
    const grant = await githubClient(credentials, impl).complete({
      redirectUri,
      code: 'c',
      codeVerifier: 'v',
    })
    expect(grant.profile).toMatchObject({ email: null, emailVerified: false })
  })

  it('fails with OAuthFailure when GitHub answers with an error instead of a token', async () => {
    const { impl } = stubFetch({
      'https://github.com/login/oauth/access_token': {
        body: { error: 'bad_verification_code' },
      },
    })
    await expect(
      githubClient(credentials, impl).complete({ redirectUri, code: 'c', codeVerifier: 'v' }),
    ).rejects.toBeInstanceOf(OAuthFailure)
  })
})

describe('createOAuthClients', () => {
  it('builds a client only for a provider whose credentials are both set', () => {
    const clients = createOAuthClients({
      GOOGLE_CLIENT_ID: 'g-id',
      GOOGLE_CLIENT_SECRET: undefined,
      GITHUB_APP_CLIENT_ID: 'gh-id',
      GITHUB_APP_CLIENT_SECRET: 'gh-secret',
    })
    expect(clients.google).toBeUndefined()
    expect(clients.github?.provider).toBe('github')
  })
})
