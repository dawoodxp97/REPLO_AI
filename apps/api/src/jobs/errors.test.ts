import { BudgetExceededError } from '@replo/ai'
import { describe, expect, it } from 'vitest'
import { classifyError, JobError } from './errors'

const LEAKY = 'Incorrect API key provided: sk-proj-abcdefghijklmnopqrstuvwx1234'

describe('classifyError', () => {
  it('keeps the authored message of a JobError', () => {
    expect(classifyError(new JobError('REPO_TOO_LARGE', false, 'too many files'))).toEqual({
      code: 'REPO_TOO_LARGE',
      retryable: false,
      detail: { message: 'too many files' },
    })
  })

  it.each([
    ['an unknown error', new Error(LEAKY), 'INTERNAL', false],
    [
      'a provider 429',
      Object.assign(new Error(LEAKY), { status: 429 }),
      'PROVIDER_UNAVAILABLE',
      true,
    ],
    [
      'a provider 503',
      Object.assign(new Error(LEAKY), { statusCode: 503 }),
      'PROVIDER_UNAVAILABLE',
      true,
    ],
    ['a timeout', Object.assign(new Error(LEAKY), { name: 'TimeoutError' }), 'TIMEOUT', true],
    ['a reset socket', Object.assign(new Error(LEAKY), { code: 'ECONNRESET' }), 'NETWORK', true],
    ['an exceeded budget', new BudgetExceededError(2, 1), 'BUDGET_EXCEEDED', false],
    ['a non-error throw', LEAKY, 'INTERNAL', false],
  ])('classifies %s without echoing provider text', (_label, err, code, retryable) => {
    const result = classifyError(err)
    expect(result.code).toBe(code)
    expect(result.retryable).toBe(retryable)
    expect(result.detail.message).not.toContain('sk-')
    expect(result.detail.message).not.toContain('Incorrect API key')
    expect(result.detail.message.length).toBeGreaterThan(0)
  })
})
