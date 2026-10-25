import { describe, expect, it, vi } from 'vitest'
import { Budget, BudgetExceededError, isRetryableProviderError } from './budget'
import { costMicros, estimateCostMicros, type ModelSpec } from './registry'

const sonnet: ModelSpec = {
  provider: 'anthropic',
  id: 'claude-sonnet-5-5',
  inputUsdPerMTok: 2,
  outputUsdPerMTok: 10,
  structuredOutput: true,
  free: false,
}

describe('cost math', () => {
  it('USD per MTok equals micro-USD per token', () => {
    expect(costMicros(sonnet, { inputTokens: 1_000_000, outputTokens: 0 })).toBe(2_000_000)
    expect(costMicros(sonnet, { inputTokens: 0, outputTokens: 1_000_000 })).toBe(10_000_000)
  })

  it('estimates grow with prompt size', () => {
    const small = estimateCostMicros(sonnet, { system: 'a', prompt: 'b' })
    const big = estimateCostMicros(sonnet, { system: 'a', prompt: 'b'.repeat(100_000) })
    expect(big).toBeGreaterThan(small)
  })
})

describe('Budget', () => {
  it('refuses a reservation above the ceiling before spending', () => {
    const budget = new Budget(1_000, vi.fn())
    expect(() => budget.reserve(1_001)).toThrow(BudgetExceededError)
    expect(budget.remainingMicros).toBe(1_000)
  })

  it('settles actual cost, frees the reservation and records usage', async () => {
    const sink = vi.fn().mockResolvedValue(undefined)
    const budget = new Budget(10_000_000, sink)
    budget.reserve(5_000_000)
    const cost = await budget.settle(
      sonnet,
      { inputTokens: 100_000, outputTokens: 10_000 },
      { jobId: 'j', stage: 'lessons' },
      5_000_000,
    )
    expect(cost).toBe(300_000)
    expect(budget.spentMicros).toBe(300_000)
    expect(budget.remainingMicros).toBe(9_700_000)
    expect(sink).toHaveBeenCalledOnce()
  })

  it('release returns a failed attempt reservation', () => {
    const budget = new Budget(1_000, vi.fn())
    budget.reserve(800)
    budget.release(800)
    expect(budget.remainingMicros).toBe(1_000)
  })
})

describe('isRetryableProviderError', () => {
  it('retries 429 and 5xx, not 400/401', () => {
    expect(isRetryableProviderError({ statusCode: 429 })).toBe(true)
    expect(isRetryableProviderError({ statusCode: 503 })).toBe(true)
    expect(isRetryableProviderError({ statusCode: 401 })).toBe(false)
    expect(isRetryableProviderError(new Error('boom'))).toBe(false)
  })
})
