import { ORPCError } from '@orpc/client'
import { describe, expect, it } from 'vitest'
import { VISIBILITY_OPTIONS, describeSharingError } from './visibility-options'

describe('describeSharingError', () => {
  it('explains the licence requirement for public tutorials', () => {
    const error = new ORPCError('PUBLIC_REQUIRES_OPEN_LICENSE', { status: 409 })
    expect(describeSharingError(error)).toContain('open-source licence')
  })

  it('falls back to a retryable message for anything else', () => {
    expect(describeSharingError(new Error('boom'))).toBe(
      'The visibility could not be changed. Try again.',
    )
  })
})

describe('VISIBILITY_OPTIONS', () => {
  it('offers private, link and public in that order', () => {
    expect(VISIBILITY_OPTIONS.map((option) => option.value)).toEqual(['private', 'link', 'public'])
  })
})
