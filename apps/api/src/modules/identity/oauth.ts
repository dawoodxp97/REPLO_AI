import { createHash, randomBytes } from 'node:crypto'
import type { OAuthProvider } from '@replo/contracts'
import { z } from 'zod'
import type { Config } from '../../platform/config'

export interface OAuthCredentials {
  clientId: string
  clientSecret: string
}

export interface OAuthProfile {
  providerAccountId: string
  email: string | null
  emailVerified: boolean
  name: string | null
  image: string | null
}

export interface OAuthGrant {
  profile: OAuthProfile
  accessToken: string
}

export interface OAuthAttempt {
  state: string
  codeVerifier: string
  codeChallenge: string
}

export interface OAuthClient {
  readonly provider: OAuthProvider
  authorizationUrl(input: { redirectUri: string; state: string; codeChallenge: string }): string
  complete(input: { redirectUri: string; code: string; codeVerifier: string }): Promise<OAuthGrant>
}

export type OAuthClients = Partial<Record<OAuthProvider, OAuthClient>>

export class OAuthFailure extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OAuthFailure'
  }
}

export const codeChallengeFor = (codeVerifier: string): string =>
  createHash('sha256').update(codeVerifier).digest('base64url')

export function newOAuthAttempt(): OAuthAttempt {
  const codeVerifier = randomBytes(32).toString('base64url')
  return {
    state: randomBytes(32).toString('base64url'),
    codeVerifier,
    codeChallenge: codeChallengeFor(codeVerifier),
  }
}

type FetchImpl = typeof fetch

const USER_AGENT = 'replo-api'
const REQUEST_TIMEOUT_MS = 10_000

interface OAuthHttp {
  postForm<S extends z.ZodType>(
    url: string,
    body: Record<string, string>,
    schema: S,
  ): Promise<z.output<S>>
  getJson<S extends z.ZodType>(url: string, accessToken: string, schema: S): Promise<z.output<S>>
}

function createOAuthHttp(fetchImpl: FetchImpl, timeoutMs: number): OAuthHttp {
  async function requestJson<S extends z.ZodType>(
    label: string,
    url: string,
    init: RequestInit,
    schema: S,
  ): Promise<z.output<S>> {
    let payload: unknown
    try {
      const response = await fetchImpl(url, { ...init, signal: AbortSignal.timeout(timeoutMs) })
      if (!response.ok) throw new OAuthFailure(`${label} endpoint responded ${response.status}`)
      payload = await response.json()
    } catch (error) {
      if (error instanceof OAuthFailure) throw error
      throw new OAuthFailure(`${label} request failed`)
    }
    const parsed = schema.safeParse(payload)
    if (!parsed.success) throw new OAuthFailure(`${label} response was not understood`)
    return parsed.data
  }

  return {
    postForm: (url, body, schema) =>
      requestJson(
        'token',
        url,
        {
          method: 'POST',
          headers: {
            accept: 'application/json',
            'content-type': 'application/x-www-form-urlencoded',
            'user-agent': USER_AGENT,
          },
          body: new URLSearchParams(body),
        },
        schema,
      ),
    getJson: (url, accessToken, schema) =>
      requestJson(
        'profile',
        url,
        {
          headers: {
            accept: 'application/json',
            authorization: `Bearer ${accessToken}`,
            'user-agent': USER_AGENT,
          },
        },
        schema,
      ),
  }
}

interface OAuthProviderSpec {
  provider: OAuthProvider
  authorizeUrl: string
  tokenUrl: string
  scope: string
  authorizeParams: Record<string, string>
  tokenParams: Record<string, string>
  fetchProfile(http: OAuthHttp, accessToken: string): Promise<OAuthProfile>
}

const TokenResponse = z.object({ access_token: z.string().min(1).optional() })

function createOAuthClient(
  spec: OAuthProviderSpec,
  credentials: OAuthCredentials,
  fetchImpl: FetchImpl,
  timeoutMs: number,
): OAuthClient {
  const http = createOAuthHttp(fetchImpl, timeoutMs)
  return {
    provider: spec.provider,
    authorizationUrl({ redirectUri, state, codeChallenge }) {
      const query = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        scope: spec.scope,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        ...spec.authorizeParams,
      })
      return `${spec.authorizeUrl}?${query.toString()}`
    },
    async complete({ redirectUri, code, codeVerifier }) {
      const token = await http.postForm(
        spec.tokenUrl,
        {
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
          ...spec.tokenParams,
        },
        TokenResponse,
      )
      if (!token.access_token) throw new OAuthFailure(`${spec.provider} returned no access token`)
      return {
        accessToken: token.access_token,
        profile: await spec.fetchProfile(http, token.access_token),
      }
    },
  }
}

const GoogleUserInfo = z.object({
  sub: z.string().min(1),
  email: z.string().nullish(),
  email_verified: z.boolean().nullish(),
  name: z.string().nullish(),
  picture: z.string().nullish(),
})

const GOOGLE_SPEC: OAuthProviderSpec = {
  provider: 'google',
  authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenUrl: 'https://oauth2.googleapis.com/token',
  scope: 'openid email profile',
  authorizeParams: { response_type: 'code', prompt: 'select_account' },
  tokenParams: { grant_type: 'authorization_code' },
  async fetchProfile(http, accessToken) {
    const info = await http.getJson(
      'https://openidconnect.googleapis.com/v1/userinfo',
      accessToken,
      GoogleUserInfo,
    )
    return {
      providerAccountId: info.sub,
      email: info.email ? info.email.toLowerCase() : null,
      emailVerified: info.email_verified === true,
      name: info.name ?? null,
      image: info.picture ?? null,
    }
  },
}

const GITHUB_API_URL = 'https://api.github.com'

const GithubUser = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  name: z.string().nullish(),
  avatar_url: z.string().nullish(),
})
const GithubEmails = z.array(
  z.object({ email: z.string().min(1), primary: z.boolean(), verified: z.boolean() }),
)

const GITHUB_SPEC: OAuthProviderSpec = {
  provider: 'github',
  authorizeUrl: 'https://github.com/login/oauth/authorize',
  tokenUrl: 'https://github.com/login/oauth/access_token',
  scope: 'read:user user:email',
  authorizeParams: { allow_signup: 'true' },
  tokenParams: {},
  async fetchProfile(http, accessToken) {
    const user = await http.getJson(`${GITHUB_API_URL}/user`, accessToken, GithubUser)
    const emails = await http.getJson(`${GITHUB_API_URL}/user/emails`, accessToken, GithubEmails)
    const primary = emails.find((entry) => entry.primary && entry.verified)
    return {
      providerAccountId: String(user.id),
      email: primary ? primary.email.toLowerCase() : null,
      emailVerified: primary !== undefined,
      name: user.name ?? user.login,
      image: user.avatar_url ?? null,
    }
  },
}

export const googleClient = (
  credentials: OAuthCredentials,
  fetchImpl: FetchImpl = fetch,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): OAuthClient => createOAuthClient(GOOGLE_SPEC, credentials, fetchImpl, timeoutMs)

export const githubClient = (
  credentials: OAuthCredentials,
  fetchImpl: FetchImpl = fetch,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): OAuthClient => createOAuthClient(GITHUB_SPEC, credentials, fetchImpl, timeoutMs)

export function createOAuthClients(
  config: Pick<
    Config,
    | 'GOOGLE_CLIENT_ID'
    | 'GOOGLE_CLIENT_SECRET'
    | 'GITHUB_APP_CLIENT_ID'
    | 'GITHUB_APP_CLIENT_SECRET'
  >,
  fetchImpl: FetchImpl = fetch,
): OAuthClients {
  const google =
    config.GOOGLE_CLIENT_ID && config.GOOGLE_CLIENT_SECRET
      ? googleClient(
          { clientId: config.GOOGLE_CLIENT_ID, clientSecret: config.GOOGLE_CLIENT_SECRET },
          fetchImpl,
        )
      : undefined
  const github =
    config.GITHUB_APP_CLIENT_ID && config.GITHUB_APP_CLIENT_SECRET
      ? githubClient(
          { clientId: config.GITHUB_APP_CLIENT_ID, clientSecret: config.GITHUB_APP_CLIENT_SECRET },
          fetchImpl,
        )
      : undefined
  return { google, github }
}
