import { ORPCError } from '@orpc/client'
import { describe, expect, it } from 'vitest'
import { describeJobActionError, describeJobFailure, FALLBACK_JOB_FAILURE } from './job-errors'

describe('describeJobFailure', () => {
  it('explains a known error code', () => {
    expect(describeJobFailure('KEY_REJECTED')).toContain('rejected your key')
  })

  it('falls back for unknown or missing codes', () => {
    expect(describeJobFailure('SOMETHING_NEW')).toBe(FALLBACK_JOB_FAILURE)
    expect(describeJobFailure(null)).toBe(FALLBACK_JOB_FAILURE)
  })
})

describe('describeJobActionError', () => {
  it('explains a conflict', () => {
    expect(describeJobActionError(new ORPCError('CONFLICT'))).toContain('changed state')
  })

  it('uses the generic message for anything else', () => {
    expect(describeJobActionError(new Error('boom'))).toBe('Something went wrong. Try again.')
  })
})
