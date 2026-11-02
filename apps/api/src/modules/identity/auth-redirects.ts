import type { OAuthProvider } from '@replo/contracts'

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
