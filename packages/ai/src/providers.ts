import type { ProviderId } from './catalog'
import { PROVIDER_TABLE, type KeyCheckRequest } from './provider-table'

export type KeyCheck = 'valid' | 'invalid' | 'unavailable'

const TIMEOUT_MS = 10_000

export function keyCheckRequest(provider: ProviderId, apiKey: string): KeyCheckRequest {
  return PROVIDER_TABLE[provider].keyCheck(apiKey)
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
