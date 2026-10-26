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

async function postForm<S extends z.ZodType>(
  fetchImpl: FetchImpl,
  url: string,
  body: Record<string, string>,
  schema: S,
): Promise<z.output<S>> {
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: {
      accept: 'application/json',
      'content-type': 'application/x-www-form-urlencoded',
      'user-agent': USER_AGENT,
    },
    body: new URLSearchParams(body),
  })
  if (!response.ok) throw new OAuthFailure(`token endpoint responded ${response.status}`)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) throw new OAuthFailure('token response was not understood')
  return parsed.data
}

async function getJson<S extends z.ZodType>(
  fetchImpl: FetchImpl,
  url: string,
  accessToken: string,
  schema: S,
): Promise<z.output<S>> {
  const response = await fetchImpl(url, {
    headers: {
      accept: 'application/json',
      authorization: `Bearer ${accessToken}`,
      'user-agent': USER_AGENT,
    },
  })
  if (!response.ok) throw new OAuthFailure(`profile endpoint responded ${response.status}`)
  const parsed = schema.safeParse(await response.json())
  if (!parsed.success) throw new OAuthFailure('profile response was not understood')
  return parsed.data
}

const GOOGLE_AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token'
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'

const GoogleTokenResponse = z.object({ access_token: z.string().min(1) })
const GoogleUserInfo = z.object({
  sub: z.string().min(1),
  email: z.string().nullish(),
  email_verified: z.boolean().nullish(),
  name: z.string().nullish(),
  picture: z.string().nullish(),
})

export function googleClient(
  credentials: OAuthCredentials,
  fetchImpl: FetchImpl = fetch,
): OAuthClient {
  return {
    provider: 'google',
    authorizationUrl({ redirectUri, state, codeChallenge }) {
      const query = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        prompt: 'select_account',
      })
      return `${GOOGLE_AUTHORIZE_URL}?${query.toString()}`
    },
    async complete({ redirectUri, code, codeVerifier }) {
      const token = await postForm(
        fetchImpl,
        GOOGLE_TOKEN_URL,
        {
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        },
        GoogleTokenResponse,
      )
      const info = await getJson(fetchImpl, GOOGLE_USERINFO_URL, token.access_token, GoogleUserInfo)
      return {
        accessToken: token.access_token,
        profile: {
          providerAccountId: info.sub,
          email: info.email ? info.email.toLowerCase() : null,
          emailVerified: info.email_verified === true,
          name: info.name ?? null,
          image: info.picture ?? null,
        },
      }
    },
  }
}

const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize'
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'
const GITHUB_API_URL = 'https://api.github.com'
const GITHUB_SCOPES = 'read:user user:email'

const GithubTokenResponse = z.object({ access_token: z.string().min(1).optional() })
const GithubUser = z.object({
  id: z.number().int().positive(),
  login: z.string().min(1),
  name: z.string().nullish(),
  avatar_url: z.string().nullish(),
})
const GithubEmails = z.array(
  z.object({ email: z.string().min(1), primary: z.boolean(), verified: z.boolean() }),
)

export function githubClient(
  credentials: OAuthCredentials,
  fetchImpl: FetchImpl = fetch,
): OAuthClient {
  return {
    provider: 'github',
    authorizationUrl({ redirectUri, state, codeChallenge }) {
      const query = new URLSearchParams({
        client_id: credentials.clientId,
        redirect_uri: redirectUri,
        scope: GITHUB_SCOPES,
        state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        allow_signup: 'true',
      })
      return `${GITHUB_AUTHORIZE_URL}?${query.toString()}`
    },
    async complete({ redirectUri, code, codeVerifier }) {
      const token = await postForm(
        fetchImpl,
        GITHUB_TOKEN_URL,
        {
          client_id: credentials.clientId,
          client_secret: credentials.clientSecret,
          code,
          code_verifier: codeVerifier,
          redirect_uri: redirectUri,
        },
        GithubTokenResponse,
      )
      if (!token.access_token) throw new OAuthFailure('GitHub returned no access token')
      const accessToken = token.access_token
      const user = await getJson(fetchImpl, `${GITHUB_API_URL}/user`, accessToken, GithubUser)
      const emails = await getJson(
        fetchImpl,
        `${GITHUB_API_URL}/user/emails`,
        accessToken,
        GithubEmails,
      )
      const primary = emails.find((entry) => entry.primary && entry.verified)
      return {
        accessToken,
        profile: {
          providerAccountId: String(user.id),
          email: primary ? primary.email.toLowerCase() : null,
          emailVerified: primary !== undefined,
          name: user.name ?? user.login,
          image: user.avatar_url ?? null,
        },
      }
    },
  }
}

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
