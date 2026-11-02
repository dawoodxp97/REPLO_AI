export const BYTES_PER_TOKEN = 3.5
export const DEFAULT_MAX_OUTPUT_TOKENS = 4096

export const SHAPE = {
  lite: { requests: 12, contextTokensPerRequest: 30_000, outputTokensPerRequest: 3_000 },
  full: { requests: 40, contextTokensPerRequest: 60_000, outputTokensPerRequest: 4_000 },
} as const

export const ROLE_SHARE = { planner: 0.2, author: 0.7, summarizer: 0.1 } as const
