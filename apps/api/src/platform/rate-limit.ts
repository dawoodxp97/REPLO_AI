export type RateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number }

const SWEEP_THRESHOLD = 10_000

export class FixedWindowLimiter {
  private readonly windows = new Map<string, { startedAt: number; count: number }>()

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  take(key: string): RateDecision {
    const current = this.now()
    this.sweep(current)
    const window = this.windows.get(key)
    if (!window || current - window.startedAt >= this.windowMs) {
      this.windows.set(key, { startedAt: current, count: 1 })
      return { allowed: true }
    }
    if (window.count < this.max) {
      window.count += 1
      return { allowed: true }
    }
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil((window.startedAt + this.windowMs - current) / 1000),
    }
  }

  private sweep(current: number): void {
    if (this.windows.size < SWEEP_THRESHOLD) return
    for (const [key, window] of this.windows) {
      if (current - window.startedAt >= this.windowMs) this.windows.delete(key)
    }
  }
}
