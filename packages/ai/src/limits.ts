// Per-job ceilings that replace the old dollar budget. Every model call reports its token
// usage here; the run also carries a wall-clock deadline. Exceeding either stops the job with
// a specific code instead of silently running up a bill (D-116, FR-GEN-5).
export class RunLimitExceededError extends Error {
  readonly code = 'RUN_LIMIT_EXCEEDED'
  constructor(
    readonly reason: 'tokens' | 'time',
    readonly used: number,
    readonly limit: number,
  ) {
    super(`Run limit exceeded (${reason}): ${used} of ${limit}`)
    this.name = 'RunLimitExceededError'
  }
}

export interface RunLimitsOptions {
  // Total input + output tokens allowed across the whole job.
  maxTokens: number
  // Absolute epoch-ms deadline for the whole job, if any.
  deadlineAt?: number | undefined
  // Clock, injectable for tests.
  now?: () => number
}

export interface TokenUsage {
  inputTokens?: number | undefined
  outputTokens?: number | undefined
}

export class RunLimits {
  readonly maxTokens: number
  readonly deadlineAt: number | undefined
  private readonly now: () => number
  private used = 0

  constructor(options: RunLimitsOptions) {
    this.maxTokens = options.maxTokens
    this.deadlineAt = options.deadlineAt
    this.now = options.now ?? Date.now
  }

  get usedTokens(): number {
    return this.used
  }

  get remainingTokens(): number {
    return Math.max(0, this.maxTokens - this.used)
  }

  // Account a completed (or billed-but-failed) model call. Throws when the ceiling is passed.
  record(usage: TokenUsage): void {
    this.used += (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0)
    this.throwIfExhausted()
  }

  // Enforce the wall-clock deadline. Call between units of work.
  throwIfExpired(): void {
    if (this.deadlineAt !== undefined && this.now() > this.deadlineAt)
      throw new RunLimitExceededError('time', this.now(), this.deadlineAt)
  }

  throwIfExhausted(): void {
    if (this.used > this.maxTokens)
      throw new RunLimitExceededError('tokens', this.used, this.maxTokens)
  }
}