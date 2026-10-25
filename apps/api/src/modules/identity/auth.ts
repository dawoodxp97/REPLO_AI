import { betterAuth } from 'better-auth'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import type { FastifyRequest } from 'fastify'
import type { Config } from '../../platform/config'
import type { Db } from '../../platform/db/client'
import * as authSchema from '../../platform/db/auth-schema'
import type { SessionUser } from '../../context'
import type { LinkedAccounts } from './identity.service'

export function createAuth(config: Config, db: Db) {
  const isProd = config.NODE_ENV === 'production'
  return betterAuth({
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    trustedOrigins: [config.PRODUCT_ORIGIN],
    database: drizzleAdapter(db, { provider: 'pg', schema: authSchema }),
    socialProviders:
      config.GITHUB_APP_CLIENT_ID && config.GITHUB_APP_CLIENT_SECRET
        ? {
            github: {
              clientId: config.GITHUB_APP_CLIENT_ID,
              clientSecret: config.GITHUB_APP_CLIENT_SECRET,
            },
          }
        : {},
    account: { encryptOAuthTokens: true },
    advanced: {
      useSecureCookies: isProd,
      defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: isProd },
      ...(config.AUTH_COOKIE_DOMAIN
        ? { crossSubDomainCookies: { enabled: true, domain: config.AUTH_COOKIE_DOMAIN } }
        : {}),
    },
  })
}

export type Auth = ReturnType<typeof createAuth>

export function toWebHeaders(raw: FastifyRequest['headers']): Headers {
  const headers = new Headers()
  for (const [key, value] of Object.entries(raw)) {
    if (value === undefined) continue
    if (Array.isArray(value)) for (const v of value) headers.append(key, v)
    else headers.set(key, value)
  }
  return headers
}

const sessions = new WeakMap<FastifyRequest, ReturnType<Auth['api']['getSession']>>()

export function sessionFromRequest(auth: Auth, request: FastifyRequest) {
  const cached = sessions.get(request)
  if (cached) return cached
  const session = auth.api.getSession({ headers: toWebHeaders(request.headers) })
  sessions.set(request, session)
  return session
}

type AuthSession = NonNullable<Awaited<ReturnType<typeof sessionFromRequest>>>

export const sessionUserOf = ({ user }: AuthSession): SessionUser => ({
  id: user.id,
  name: user.name,
  email: user.email,
  image: user.image ?? null,
})

export function betterAuthAccounts(auth: Auth): LinkedAccounts {
  return {
    list: (headers) => auth.api.listUserAccounts({ headers }),
    accessToken: async (accountId, headers) =>
      (await auth.api.getAccessToken({ body: { accountId }, headers })).accessToken,
  }
}
