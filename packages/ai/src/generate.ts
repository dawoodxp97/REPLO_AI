import { generateText, Output, type LanguageModel } from 'ai'
import type { z } from 'zod'
import { BudgetExceededError, isRetryableProviderError, type Budget } from './budget'
import {
  DEFAULT_MAX_OUTPUT_TOKENS,
  estimateCostMicros,
  type ModelRole,
  type ModelSpec,
  type Registry,
} from './registry'

export interface GenerateStructuredOptions<S extends z.ZodType> {
  role: ModelRole
  schema: S
  system: string
  prompt: string
  budget: Budget
  registry: Registry
  resolveModel: (spec: ModelSpec) => LanguageModel
  meta: { jobId: string; stage: string }
  maxOutputTokens?: number
  signal?: AbortSignal
}

export async function generateStructured<S extends z.ZodType>(
  opts: GenerateStructuredOptions<S>,
): Promise<z.infer<S>> {
  const maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  let lastError: unknown

  for (const spec of opts.registry[opts.role]) {
    const estimate = estimateCostMicros(spec, opts, maxOutputTokens)
    opts.budget.reserve(estimate)
    const startedAt = Date.now()
    let res
    try {
      res = await generateText({
        model: opts.resolveModel(spec),
        system: opts.system,
        prompt: opts.prompt,
        output: Output.object({ schema: opts.schema }),
        maxOutputTokens,
        maxRetries: 2,
        abortSignal: opts.signal,
      })
    } catch (err) {
      opts.budget.release(estimate)
      if (err instanceof BudgetExceededError || !isRetryableProviderError(err)) throw err
      lastError = err
      continue
    }
    await opts.budget.settle(
      spec,
      res.usage,
      { ...opts.meta, latencyMs: Date.now() - startedAt },
      estimate,
    )
    return res.output as z.infer<S>
  }
  throw lastError ?? new Error(`No models configured for role "${opts.role}"`)
}
