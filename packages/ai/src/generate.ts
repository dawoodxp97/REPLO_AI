import { generateText, Output, type LanguageModel } from 'ai'
import type { z } from 'zod'
import type { Budget } from './budget'
import { DEFAULT_MAX_OUTPUT_TOKENS } from './constants'
import { estimateCostMicros, type ModelSpec } from './registry'

export interface GenerateStructuredOptions<S extends z.ZodType> {
  spec: ModelSpec
  schema: S
  system: string
  prompt: string
  budget: Budget
  model: LanguageModel
  meta: { jobId: string; stage: string }
  maxOutputTokens?: number
  signal?: AbortSignal
}

interface ErrorUsage {
  inputTokens?: number | undefined
  outputTokens?: number | undefined
}

function billedUsage(err: unknown): ErrorUsage | undefined {
  if (typeof err !== 'object' || err === null || !('usage' in err)) return undefined
  const usage = err.usage
  if (typeof usage !== 'object' || usage === null) return undefined
  const inputTokens = 'inputTokens' in usage ? usage.inputTokens : undefined
  const outputTokens = 'outputTokens' in usage ? usage.outputTokens : undefined
  if (typeof inputTokens !== 'number' && typeof outputTokens !== 'number') return undefined
  return {
    inputTokens: typeof inputTokens === 'number' ? inputTokens : undefined,
    outputTokens: typeof outputTokens === 'number' ? outputTokens : undefined,
  }
}

export async function generateStructured<S extends z.ZodType>(
  opts: GenerateStructuredOptions<S>,
): Promise<z.infer<S>> {
  const maxOutputTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS
  const estimate = estimateCostMicros(opts.spec, opts, maxOutputTokens)
  opts.budget.reserve(estimate)
  const startedAt = Date.now()
  let res
  try {
    res = await generateText({
      model: opts.model,
      system: opts.system,
      prompt: opts.prompt,
      output: Output.object({ schema: opts.schema }),
      maxOutputTokens,
      maxRetries: 2,
      abortSignal: opts.signal,
    })
  } catch (err) {
    const usage = billedUsage(err)
    if (usage)
      await opts.budget.settle(
        opts.spec,
        usage,
        { ...opts.meta, latencyMs: Date.now() - startedAt },
        estimate,
      )
    else opts.budget.release(estimate)
    throw err
  }
  await opts.budget.settle(
    opts.spec,
    res.usage,
    { ...opts.meta, latencyMs: Date.now() - startedAt },
    estimate,
  )
  return res.output as z.infer<S>
}
