import { ORPCError } from '@orpc/client'
import { describe, expect, it } from 'vitest'
import { describeImportError } from './import-errors'

describe('describeImportError', () => {
  it('names the limit that was crossed for a file-count refusal', () => {
    const error = new ORPCError('REPO_TOO_LARGE', {
      status: 422,
      data: { metric: 'files', value: 6200, limit: 5000 },
    })
    expect(describeImportError(error)).toContain('5,000 files')
  })

  it('names the limit that was crossed for a byte-size refusal', () => {
    const error = new ORPCError('REPO_TOO_LARGE', {
      status: 422,
      data: { metric: 'bytes', value: 60_000_000, limit: 52_428_800 },
    })
    expect(describeImportError(error)).toContain('50 MB')
  })

  it('explains a model that is not allowed', () => {
    const error = new ORPCError('MODEL_NOT_ALLOWED', {
      status: 422,
      data: { modelId: 'unknown/model' },
    })
    expect(describeImportError(error)).toContain('not verified')
  })

  it('maps a known refusal code to its copy', () => {
    const error = new ORPCError('KEY_INVALID', { status: 400 })
    expect(describeImportError(error)).toContain('The provider rejected this key')
  })

  it('falls back to generic copy for an unknown code', () => {
    expect(describeImportError(new ORPCError('SOMETHING_NEW', { status: 500 }))).toBe(
      'Something went wrong. Try again.',
    )
  })

  it('falls back to generic copy when a refusal carries unexpected data', () => {
    const error = new ORPCError('REPO_TOO_LARGE', { status: 422, data: { nope: true } })
    expect(describeImportError(error)).toBe('Something went wrong. Try again.')
  })

  it('falls back to generic copy for a network failure', () => {
    expect(describeImportError(new TypeError('fetch failed'))).toBe(
      'Something went wrong. Try again.',
    )
  })
})
