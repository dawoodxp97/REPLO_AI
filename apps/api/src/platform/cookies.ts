export interface CookieOptions {
  httpOnly: boolean
  secure: boolean
  sameSite: 'Lax' | 'Strict' | 'None'
  path: string
  domain?: string
  maxAgeSeconds?: number
}

export function serializeCookie(name: string, value: string, options: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(value)}`, `Path=${options.path}`]
  if (options.maxAgeSeconds !== undefined) parts.push(`Max-Age=${options.maxAgeSeconds}`)
  if (options.domain) parts.push(`Domain=${options.domain}`)
  parts.push(`SameSite=${options.sameSite}`)
  if (options.httpOnly) parts.push('HttpOnly')
  if (options.secure) parts.push('Secure')
  return parts.join('; ')
}

export function parseCookies(header: string | undefined): ReadonlyMap<string, string> {
  const cookies = new Map<string, string>()
  for (const pair of (header ?? '').split(';')) {
    const separator = pair.indexOf('=')
    if (separator <= 0) continue
    const name = pair.slice(0, separator).trim()
    if (cookies.has(name)) continue
    try {
      cookies.set(name, decodeURIComponent(pair.slice(separator + 1).trim()))
    } catch {
      continue
    }
  }
  return cookies
}
