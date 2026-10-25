import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Budget, BudgetExceededError } from './budget'
import { generateStructured } from './generate'
import type { ModelSpec, Registry } from './registry'

const spec = (id: string, inputUsdPerMTok = 2, outputUsdPerMTok = 10): ModelSpec => ({
  provider: 'anthropic',
  id,
  inputUsdPerMTok,
  outputUsdPerMTok,
  structuredOutput: true,
  free: false,
})

const registryWith = (...author: ModelSpec[]): Registry => ({
  planner: author,
  author,
  summarizer: author,
  judge: author,
})

const reply = (value: unknown, inputTokens = 11, outputTokens = 7) =>
  new MockLanguageModelV3({
    doGenerate: async () => ({
      content: [{ type: 'text', text: JSON.stringify(value) }],
      finishReason: { unified: 'stop', raw: undefined },
      usage: {
        inputTokens: {
          total: inputTokens,
          noCache: inputTokens,
          cacheRead: undefined,
          cacheWrite: undefined,
        },
        outputTokens: { total: outputTokens, text: outputTokens, reasoning: undefined },
      },
      warnings: [],
    }),
  })

const failing = (statusCode: number) =>
  new MockLanguageModelV3({
    doGenerate: async () => {
      throw Object.assign(new Error(`provider ${statusCode}`), { statusCode })
    },
  })

const schema = z.object({ title: z.string() })

const options = (
  registry: Registry,
  budget: Budget,
  resolve: (s: ModelSpec) => MockLanguageModelV3,
) => ({
  role: 'author' as const,
  schema,
  system: 'system',
  prompt: 'prompt',
  budget,
  registry,
  resolveModel: resolve,
  meta: { jobId: 'job-1', stage: 'lessons' },
})

describe('generateStructured', () => {
  it('returns the parsed object and records the provider’s own usage numbers', async () => {
    const sink = vi.fn(async () => undefined)
    const budget = new Budget(1_000_000_000, sink)
    const premium = spec('premium', 2, 10)
    const result = await generateStructured(
      options(registryWith(premium), budget, () => reply({ title: 'Cart' })),
    )
    expect(result).toEqual({ title: 'Cart' })
    expect(sink).toHaveBeenCalledWith(
      expect.objectContaining({
        jobId: 'job-1',
        stage: 'lessons',
        inputTokens: 11,
        outputTokens: 7,
        costMicros: 11 * 2 + 7 * 10,
      }),
    )
    expect(budget.spentMicros).toBe(11 * 2 + 7 * 10)
  })

  it('falls through to the next model on a retryable provider error', async () => {
    const sink = vi.fn(async () => undefined)
    const budget = new Budget(1_000_000_000, sink)
    const primary = spec('primary')
    const fallback = spec('fallback')
    const result = await generateStructured(
      options(registryWith(primary, fallback), budget, (s) =>
        s.id === 'primary' ? failing(429) : reply({ title: 'From fallback' }),
      ),
    )
    expect(result).toEqual({ title: 'From fallback' })
    expect(sink).toHaveBeenCalledWith(expect.objectContaining({ spec: fallback }))
  })

  it('never falls back on a non-retryable error such as a rejected key', async () => {
    const budget = new Budget(
      1_000_000_000,
      vi.fn(async () => undefined),
    )
    const primary = spec('primary')
    const fallback = spec('fallback')
    const resolve = vi.fn((s: ModelSpec) =>
      s.id === 'primary' ? failing(401) : reply({ title: 'x' }),
    )
    await expect(
      generateStructured(options(registryWith(primary, fallback), budget, resolve)),
    ).rejects.toThrow('provider 401')
    expect(resolve).toHaveBeenCalledTimes(1)
  })

  it('refuses before any call when the reservation exceeds the job budget', async () => {
    const budget = new Budget(
      1,
      vi.fn(async () => undefined),
    )
    const resolve = vi.fn(() => reply({ title: 'never' }))
    await expect(
      generateStructured(options(registryWith(spec('premium')), budget, resolve)),
    ).rejects.toBeInstanceOf(BudgetExceededError)
    expect(resolve).not.toHaveBeenCalled()
  })

  it('does not release or retry when recording usage fails after a successful call', async () => {
    const budget = new Budget(
      1_000_000_000,
      vi.fn(async () => {
        throw new Error('usage sink down')
      }),
    )
    budget.reserve(500)
    const resolve = vi.fn(() => reply({ title: 'first' }))
    await expect(
      generateStructured(options(registryWith(spec('primary'), spec('fallback')), budget, resolve)),
    ).rejects.toThrow('usage sink down')
    expect(resolve).toHaveBeenCalledTimes(1)
    expect(budget.remainingMicros).toBe(1_000_000_000 - budget.spentMicros - 500)
  })
})
