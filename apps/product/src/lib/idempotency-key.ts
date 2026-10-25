export interface IdempotencyKeys {
  keyFor(payload: unknown): string
}

interface Attempt {
  fingerprint: string
  key: string
}

export function createIdempotencyKeys(): IdempotencyKeys {
  let attempt: Attempt | undefined
  return {
    keyFor(payload) {
      const fingerprint = JSON.stringify(payload)
      if (attempt?.fingerprint !== fingerprint) {
        attempt = { fingerprint, key: crypto.randomUUID() }
      }
      return attempt.key
    },
  }
}
