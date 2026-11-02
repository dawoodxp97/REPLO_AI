import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { Budget, BudgetExceededError } from './budget'
import { generateStructured } from './generate'
import type { ModelSpec } from './registry'

const spec = (id: string, inputUsdPerMTok = 2, outputUsdPerMTok = 10): ModelSpec => ({
  provider: 'anthropic',
  id,
  inputUsdPerMTok,
  outputUsdPerMTok,
  structuredOutput: true,
  free: false,
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

const options = (spec: ModelSpec, budget: Budget, model: MockLanguageModelV3) => ({
  spec,
  schema,
  system: 'system',
  prompt: 'prompt',
  budget,
  model,
  meta: { jobId: 'job-1', stage: 'lessons' },
})

describe('generateStructured', () => {
  it('returns the parsed object and records the provider’s own usage numbers', async () => {
    const sink = vi.fn(async () => undefined)
    const budget = new Budget(1_000_000_000, sink)
    const premium = spec('premium', 2, 10)
    const result = await generateStructured(options(premium, budget, reply({ title: 'Cart' })))
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

  it('releases the reservation when the provider rejects the call', async () => {
    const sink = vi.fn(async () => undefined)
    const budget = new Budget(1_000_000_000, sink)
    await expect(
      generateStructured(options(spec('primary'), budget, failing(401))),
    ).rejects.toThrow('provider 401')
    expect(budget.remainingMicros).toBe(1_000_000_000)
    expect(sink).not.toHaveBeenCalled()
  })

  it('records spend for a billed call whose output fails validation', async () => {
    const sink = vi.fn(async () => undefined)
    const budget = new Budget(1_000_000_000, sink)
    await expect(
      generateStructured(options(spec('primary'), budget, reply({ wrong: 1 }, 11, 7))),
    ).rejects.toThrow()
    expect(budget.spentMicros).toBe(11 * 2 + 7 * 10)
    expect(budget.remainingMicros).toBe(1_000_000_000 - budget.spentMicros)
    expect(sink).toHaveBeenCalledOnce()
  })

  it('refuses before any call when the reservation exceeds the job budget', async () => {
    const budget = new Budget(
      1,
      vi.fn(async () => undefined),
    )
    const model = reply({ title: 'never' })
    await expect(
      generateStructured(options(spec('premium'), budget, model)),
    ).rejects.toBeInstanceOf(BudgetExceededError)
    expect(model.doGenerateCalls).toHaveLength(0)
  })

  it('does not release when recording usage fails after a successful call', async () => {
    const budget = new Budget(
      1_000_000_000,
      vi.fn(async () => {
        throw new Error('usage sink down')
      }),
    )
    budget.reserve(500)
    const model = reply({ title: 'first' })
    await expect(generateStructured(options(spec('primary'), budget, model))).rejects.toThrow(
      'usage sink down',
    )
    expect(model.doGenerateCalls).toHaveLength(1)
    expect(budget.remainingMicros).toBe(1_000_000_000 - budget.spentMicros - 500)
  })
})
