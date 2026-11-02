import { ORPCError } from '@orpc/client'
import { describe, expect, it } from 'vitest'
import { createErrorDescriber, GENERIC_ERROR } from './error-copy'

const describeError = createErrorDescriber(
  { KNOWN: 'Known copy.' },
  { WITH_DATA: (data) => (typeof data === 'string' ? `Data: ${data}` : null) },
)

describe('createErrorDescriber', () => {
  it('maps a known code to its copy', () => {
    expect(describeError(new ORPCError('KNOWN', { status: 400 }))).toBe('Known copy.')
  })

  it('describes a code from its data', () => {
    expect(describeError(new ORPCError('WITH_DATA', { status: 422, data: 'x' }))).toBe('Data: x')
  })

  it('falls back when the data cannot be described', () => {
    expect(describeError(new ORPCError('WITH_DATA', { status: 422, data: 1 }))).toBe(GENERIC_ERROR)
  })

  it('falls back for an unknown code and for non-API errors', () => {
    expect(describeError(new ORPCError('OTHER', { status: 500 }))).toBe(GENERIC_ERROR)
    expect(describeError(new TypeError('fetch failed'))).toBe(GENERIC_ERROR)
  })
})
