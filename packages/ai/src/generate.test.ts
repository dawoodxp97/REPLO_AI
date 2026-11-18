import { MockLanguageModelV3 } from 'ai/test'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { generateStructured } from './generate'
import { RunLimits, RunLimitExceededError } from './limits'
import type { ModelSpec } from './registry'

const spec = (id: string): ModelSpec => ({
  provider: 'anthropic',
  id,
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

const options = (model: MockLanguageModelV3, limits = new RunLimits({ maxTokens: 1_000_000 })) => ({
  spec: spec('primary'),
  schema,
  system: 'system',
  prompt: 'prompt',
  limits,
  model,
})

describe('generateStructured', () => {
  it('returns the parsed object and accounts the provider’s own usage numbers', async () => {
    const limits = new RunLimits({ maxTokens: 1_000_000 })
    const result = await generateStructured(options(reply({ title: 'Cart' }), limits))
    expect(result).toEqual({ title: 'Cart' })
    expect(limits.usedTokens).toBe(11 + 7)
  })

  it('does not account tokens when the provider rejects the call', async () => {
    const limits = new RunLimits({ maxTokens: 1_000_000 })
    await expect(generateStructured(options(failing(401), limits))).rejects.toThrow('provider 401')
    expect(limits.usedTokens).toBe(0)
  })

  it('accounts a billed call whose output fails validation', async () => {
    const limits = new RunLimits({ maxTokens: 1_000_000 })
    await expect(
      generateStructured(options(reply({ wrong: 1 }, 11, 7), limits)),
    ).rejects.toThrow()
    expect(limits.usedTokens).toBe(18)
  })

  it('throws once a call pushes the run past its token ceiling', async () => {
    const limits = new RunLimits({ maxTokens: 10})
    await expect(
      generateStructured(options(reply({ title: 'over' }, 11, 7), limits)),
    ).rejects.toBeInstanceOf(RunLimitExceededError)
    expect(limits.remainingTokens).toBe(0)
  })
})