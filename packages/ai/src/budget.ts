import { costMicros, type ModelSpec } from './registry'

export class BudgetExceededError extends Error {
  readonly code = 'BUDGET_EXCEEDED'
  constructor(
    readonly needed: number,
    readonly remaining: number,
  ) {
    super(`Budget exceeded: need ${needed} micro-USD, ${remaining} remaining`)
  }
}

export interface UsageRecord {
  jobId: string
  stage: string
  spec: ModelSpec
  inputTokens: number
  outputTokens: number
  costMicros: number
  latencyMs: number
}

export type UsageSink = (record: UsageRecord) => Promise<void>

export class Budget {
  private spent: number
  private reserved = 0

  constructor(
    readonly ceilingMicros: number,
    private readonly sink: UsageSink,
    spentMicros = 0,
  ) {
    this.spent = spentMicros
  }

  get spentMicros() {
    return this.spent
  }

  get remainingMicros() {
    return this.ceilingMicros - this.spent - this.reserved
  }

  reserve(estimateMicros: number): void {
    if (estimateMicros > this.remainingMicros)
      throw new BudgetExceededError(estimateMicros, this.remainingMicros)
    this.reserved += estimateMicros
  }

  release(estimateMicros = this.reserved): void {
    this.reserved = Math.max(0, this.reserved - estimateMicros)
  }

  async settle(
    spec: ModelSpec,
    usage: { inputTokens?: number | undefined; outputTokens?: number | undefined },
    meta: { jobId: string; stage: string; latencyMs?: number },
    reservedMicros = this.reserved,
  ): Promise<number> {
    const cost = costMicros(spec, usage)
    this.reserved = Math.max(0, this.reserved - reservedMicros)
    this.spent += cost
    await this.sink({
      jobId: meta.jobId,
      stage: meta.stage,
      spec,
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      costMicros: cost,
      latencyMs: meta.latencyMs ?? 0,
    })
    return cost
  }
}

export function isRetryableProviderError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  if ('isRetryable' in err && err.isRetryable === true) return true
  const statusCode = 'statusCode' in err ? err.statusCode : undefined
  const status = statusCode ?? ('status' in err ? err.status : undefined)
  if (status === 429 || (typeof status === 'number' && status >= 500)) return true
  const code = 'code' in err ? err.code : undefined
  const name = 'name' in err ? err.name : undefined
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || name === 'TimeoutError'
}
