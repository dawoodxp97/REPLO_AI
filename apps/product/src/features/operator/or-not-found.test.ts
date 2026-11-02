import { ORPCError } from '@orpc/client'
import { describe, expect, it, vi } from 'vitest'
import { orNotFound } from './or-not-found'

vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
}))

describe('orNotFound', () => {
  it('returns the resolved value', async () => {
    await expect(orNotFound(Promise.resolve(42))).resolves.toBe(42)
  })

  it.each(['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND'])('maps %s to not found', async (code) => {
    await expect(orNotFound(Promise.reject(new ORPCError(code)))).rejects.toThrow('NEXT_NOT_FOUND')
  })

  it('rethrows server errors so the error boundary shows them', async () => {
    const failure = new ORPCError('INTERNAL_SERVER_ERROR')
    await expect(orNotFound(Promise.reject(failure))).rejects.toBe(failure)
  })

  it('rethrows network failures', async () => {
    const failure = new TypeError('fetch failed')
    await expect(orNotFound(Promise.reject(failure))).rejects.toBe(failure)
  })
})
