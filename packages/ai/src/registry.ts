import type { ProviderId } from './catalog'

export type ModelRole = 'planner' | 'author' | 'summarizer' | 'judge'

export interface ModelSpec {
  provider: ProviderId
  id: string
  inputUsdPerMTok: number
  outputUsdPerMTok: number
  structuredOutput: boolean
  free: boolean
}

export type Registry = Record<ModelRole, ModelSpec[]>

export const BYTES_PER_TOKEN = 3.5
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096

export function microsFor(
  inputTokens: number,
  outputTokens: number,
  rates: Pick<ModelSpec, 'inputUsdPerMTok' | 'outputUsdPerMTok'>,
): number {
  return Math.ceil(inputTokens * rates.inputUsdPerMTok + outputTokens * rates.outputUsdPerMTok)
}

export function estimateCostMicros(
  spec: ModelSpec,
  input: { system: string; prompt: string },
  maxOutputTokens = DEFAULT_MAX_OUTPUT_TOKENS,
): number {
  const encoder = new TextEncoder()
  const inputBytes =
    encoder.encode(input.system).byteLength + encoder.encode(input.prompt).byteLength
  return microsFor(Math.ceil(inputBytes / BYTES_PER_TOKEN), maxOutputTokens, spec)
}

export function costMicros(
  spec: ModelSpec,
  usage: { inputTokens?: number | undefined; outputTokens?: number | undefined },
): number {
  return microsFor(usage.inputTokens ?? 0, usage.outputTokens ?? 0, spec)
}
