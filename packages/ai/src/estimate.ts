import { BYTES_PER_TOKEN, ROLE_SHARE, SHAPE } from './constants'
import { microsFor } from './registry'

export interface RoleCost {
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

export interface EstimateInput {
  pipeline: 'lite' | 'full'
  totalBytes: number
  roles: { planner: RoleCost; author: RoleCost; summarizer: RoleCost | null }
}

export interface RunCostEstimate {
  requests: number
  inputTokens: number
  outputTokens: number
  costMicros: number
}

export function estimateRun(input: EstimateInput): RunCostEstimate {
  const shape = SHAPE[input.pipeline]
  const repoTokens = Math.ceil(input.totalBytes / BYTES_PER_TOKEN)
  const contextPerRequest = Math.min(repoTokens, shape.contextTokensPerRequest)
  const requests = shape.requests
  let costMicros = 0
  let inputTokens = 0
  let outputTokens = 0
  for (const [name, share] of Object.entries(ROLE_SHARE) as [keyof typeof ROLE_SHARE, number][]) {
    const cost = input.roles[name]
    if (cost === null) continue
    const roleRequests = requests * share
    const roleInput = Math.ceil(roleRequests * contextPerRequest)
    const roleOutput = Math.ceil(roleRequests * shape.outputTokensPerRequest)
    inputTokens += roleInput
    outputTokens += roleOutput
    costMicros += microsFor(roleInput, roleOutput, cost)
  }
  return { requests, inputTokens, outputTokens, costMicros }
}
