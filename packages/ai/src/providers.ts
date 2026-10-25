import type { ProviderId } from './catalog'

export type KeyCheck = 'valid' | 'invalid' | 'unavailable'

export interface KeyCheckRequest {
  url: string
  headers: Record<string, string>
}

const TIMEOUT_MS = 10_000

export function keyCheckRequest(provider: ProviderId, apiKey: string): KeyCheckRequest {
  switch (provider) {
    case 'openrouter':
      return {
        url: 'https://openrouter.ai/api/v1/auth/key',
        headers: { authorization: `Bearer ${apiKey}` },
      }
    case 'openai':
      return {
        url: 'https://api.openai.com/v1/models',
        headers: { authorization: `Bearer ${apiKey}` },
      }
    case 'anthropic':
      return {
        url: 'https://api.anthropic.com/v1/models',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      }
    case 'google':
      return {
        url: 'https://generativelanguage.googleapis.com/v1beta/models',
        headers: { 'x-goog-api-key': apiKey },
      }
  }
}

export interface KeyChecker {
  check(provider: ProviderId, apiKey: string): Promise<KeyCheck>
}

export function createKeyChecker(fetchImpl: typeof fetch = fetch): KeyChecker {
  return {
    async check(provider, apiKey) {
      const request = keyCheckRequest(provider, apiKey)
      try {
        const response = await fetchImpl(request.url, {
          method: 'GET',
          headers: request.headers,
          redirect: 'error',
          signal: AbortSignal.timeout(TIMEOUT_MS),
        })
        if (response.ok) return 'valid'
        if (response.status === 401 || response.status === 403) return 'invalid'
        return 'unavailable'
      } catch {
        return 'unavailable'
      }
    },
  }
}
