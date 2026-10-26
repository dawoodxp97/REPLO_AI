import { createHash, randomBytes } from 'node:crypto'
import { serializeCookie } from '../../platform/cookies'

export const SESSION_COOKIE = 'replo_session'
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000

export const newSessionToken = (): string => randomBytes(32).toString('base64url')

export const hashSessionToken = (token: string): string =>
  createHash('sha256').update(token).digest('base64url')

export interface SessionCookie {
  issue(token: string): string
  clear(): string
}

export function createSessionCookie(options: {
  secure: boolean
  domain: string | undefined
}): SessionCookie {
  const base = {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'Lax',
    path: '/',
    domain: options.domain,
  } as const
  return {
    issue: (token) =>
      serializeCookie(SESSION_COOKIE, token, {
        ...base,
        maxAgeSeconds: SESSION_LIFETIME_MS / 1000,
      }),
    clear: () => serializeCookie(SESSION_COOKIE, '', { ...base, maxAgeSeconds: 0 }),
  }
}
