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

  it('shows the estimate and the ceiling when the budget is too low', () => {
    const error = new ORPCError('BUDGET_BELOW_ESTIMATE', {
      status: 422,
      data: { estimateUsd: 2.4, budgetUsd: 1 },
    })
    expect(describeImportError(error)).toBe(
      'The estimate is $2.40, above your $1.00 ceiling. Raise the ceiling or choose a cheaper preset.',
    )
  })

  it('shows the reason a preset is unavailable', () => {
    const error = new ORPCError('PRESET_UNAVAILABLE', {
      status: 422,
      data: { reason: 'No verified free model is on the allow-list yet.' },
    })
    expect(describeImportError(error)).toBe('No verified free model is on the allow-list yet.')
  })

  it('maps a known refusal code to its copy', () => {
    const error = new ORPCError('KEY_INVALID', { status: 400 })
    expect(describeImportError(error)).toContain('rejected by the provider')
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
