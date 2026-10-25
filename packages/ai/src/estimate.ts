import { BYTES_PER_TOKEN, microsFor } from './registry'

export interface RoleCost {
  inputUsdPerMTok: number
  outputUsdPerMTok: number
}

export interface EstimateInput {
  pipeline: 'lite' | 'full'
  totalBytes: number
  roles: { planner: RoleCost; author: RoleCost; summarizer: RoleCost | null }
}

export interface RunEstimate {
  requests: number
  inputTokens: number
  outputTokens: number
  costMicros: number
}

const SHAPE = {
  lite: { requests: 12, contextTokensPerRequest: 30_000, outputTokensPerRequest: 3_000 },
  full: { requests: 40, contextTokensPerRequest: 60_000, outputTokensPerRequest: 4_000 },
} as const

const ROLE_SHARE = { planner: 0.2, author: 0.7, summarizer: 0.1 } as const

export function estimateRun(input: EstimateInput): RunEstimate {
  const shape = SHAPE[input.pipeline]
  const repoTokens = Math.ceil(input.totalBytes / BYTES_PER_TOKEN)
  const contextPerRequest = Math.min(repoTokens, shape.contextTokensPerRequest)
  const requests = shape.requests
  let costMicros = 0
  let inputTokens = 0
  let outputTokens = 0
  const roles = [
    { share: ROLE_SHARE.planner, cost: input.roles.planner },
    { share: ROLE_SHARE.author, cost: input.roles.author },
    { share: ROLE_SHARE.summarizer, cost: input.roles.summarizer },
  ]
  for (const role of roles) {
    if (role.cost === null) continue
    const roleRequests = requests * role.share
    const roleInput = Math.ceil(roleRequests * contextPerRequest)
    const roleOutput = Math.ceil(roleRequests * shape.outputTokensPerRequest)
    inputTokens += roleInput
    outputTokens += roleOutput
    costMicros += microsFor(roleInput, roleOutput, role.cost)
  }
  return { requests, inputTokens, outputTokens, costMicros }
}
