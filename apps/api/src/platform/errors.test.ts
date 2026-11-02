import { describe, expect, it } from 'vitest'
import { requireFound } from './errors'

describe('requireFound', () => {
  it('returns the value when present, including falsy ones', () => {
    expect(requireFound({ id: 1 }, 'Thing')).toEqual({ id: 1 })
    expect(requireFound(0)).toBe(0)
    expect(requireFound('')).toBe('')
  })

  it('answers NOT_FOUND for null and undefined', () => {
    expect(() => requireFound(undefined, 'Key')).toThrowError(
      expect.objectContaining({ code: 'NOT_FOUND', message: 'Key not found' }),
    )
    expect(() => requireFound(null)).toThrowError(expect.objectContaining({ code: 'NOT_FOUND' }))
  })
})
