import { OAuthProvider } from '@replo/contracts'
import { z } from 'zod'
import { parseCookies } from '../../platform/cookies'

export const ATTEMPT_COOKIE = 'replo_oauth'

export const AuthIntent = z.enum(['sign-in', 'link'])

const Attempt = z.object({
  provider: OAuthProvider,
  state: z.string().min(1),
  codeVerifier: z.string().min(1),
  intent: AuthIntent,
})

export type Attempt = z.infer<typeof Attempt>

export const encodeAttempt = (attempt: Attempt): string =>
  Buffer.from(JSON.stringify(attempt)).toString('base64url')

export function readAttempt(cookieHeader: string | undefined): Attempt | undefined {
  const raw = parseCookies(cookieHeader).get(ATTEMPT_COOKIE)
  if (!raw) return undefined
  let json: unknown
  try {
    json = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8'))
  } catch {
    return undefined
  }
  const parsed = Attempt.safeParse(json)
  return parsed.success ? parsed.data : undefined
}
