import { describe, expect, it } from 'vitest'
import { createIdempotencyKeys } from './idempotency-key'

describe('createIdempotencyKeys', () => {
  it('reuses the key when the same payload is retried', () => {
    const keys = createIdempotencyKeys()
    const payload = { source: { kind: 'public_url', url: 'https://github.com/a/b' } }
    expect(keys.keyFor(payload)).toBe(keys.keyFor({ ...payload }))
  })

  it('issues a new key when the payload changes', () => {
    const keys = createIdempotencyKeys()
    const first = keys.keyFor({ preset: 'free' })
    expect(keys.keyFor({ preset: 'balanced' })).not.toBe(first)
  })

  it('gives independent stores independent keys', () => {
    const payload = { preset: 'free' }
    expect(createIdempotencyKeys().keyFor(payload)).not.toBe(
      createIdempotencyKeys().keyFor(payload),
    )
  })
})
