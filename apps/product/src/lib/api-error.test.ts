import { ORPCError } from '@orpc/client'
import { describe, expect, it } from 'vitest'
import {
  apiErrorDetails,
  isApiErrorCode,
  nullOnApiError,
  nullOnNotFound,
  shouldRetryQuery,
} from './api-error'

describe('apiErrorDetails', () => {
  it('reads the code and data of an oRPC error', () => {
    const error = new ORPCError('REPO_TOO_LARGE', { status: 422, data: { limit: 5 } })
    expect(apiErrorDetails(error)).toEqual({ code: 'REPO_TOO_LARGE', data: { limit: 5 } })
  })

  it('returns null for anything that is not an oRPC error', () => {
    expect(apiErrorDetails(new TypeError('fetch failed'))).toBeNull()
    expect(apiErrorDetails(undefined)).toBeNull()
  })
})

describe('isApiErrorCode', () => {
  it('matches only the requested code', () => {
    const error = new ORPCError('UNAUTHORIZED', { status: 401 })
    expect(isApiErrorCode(error, 'UNAUTHORIZED')).toBe(true)
    expect(isApiErrorCode(error, 'NOT_FOUND')).toBe(false)
    expect(isApiErrorCode(null, 'UNAUTHORIZED')).toBe(false)
  })
})

describe('shouldRetryQuery', () => {
  it('retries a network failure once', () => {
    expect(shouldRetryQuery(0, new TypeError('fetch failed'))).toBe(true)
    expect(shouldRetryQuery(1, new TypeError('fetch failed'))).toBe(false)
  })

  it('never retries a client error', () => {
    expect(shouldRetryQuery(0, new ORPCError('UNAUTHORIZED', { status: 401 }))).toBe(false)
  })

  it('retries a server error once', () => {
    expect(shouldRetryQuery(0, new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 }))).toBe(true)
  })
})

describe('nullOnApiError', () => {
  it('passes the value through', async () => {
    await expect(nullOnApiError(Promise.resolve(7), 'NOT_FOUND')).resolves.toBe(7)
  })

  it('turns the requested code into null', async () => {
    const failure = Promise.reject(new ORPCError('UNAUTHORIZED', { status: 401 }))
    await expect(nullOnApiError(failure, 'UNAUTHORIZED')).resolves.toBeNull()
  })

  it('rethrows every other failure', async () => {
    const failure = Promise.reject(new ORPCError('INTERNAL_SERVER_ERROR', { status: 500 }))
    await expect(nullOnApiError(failure, 'NOT_FOUND')).rejects.toBeInstanceOf(ORPCError)
    await expect(nullOnApiError(Promise.reject(new TypeError('x')), 'NOT_FOUND')).rejects.toThrow(
      'x',
    )
  })
})

describe('nullOnNotFound', () => {
  it('turns NOT_FOUND into null', async () => {
    const failure = Promise.reject(new ORPCError('NOT_FOUND', { status: 404 }))
    await expect(nullOnNotFound(failure)).resolves.toBeNull()
  })
})
