export type RateDecision = { allowed: true } | { allowed: false; retryAfterSeconds: number }

export const DEFAULT_MAX_TRACKED_KEYS = 50_000

interface Window {
  startedAt: number
  count: number
}

export class FixedWindowLimiter {
  private readonly windows = new Map<string, Window>()

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
    private readonly maxTrackedKeys: number = DEFAULT_MAX_TRACKED_KEYS,
  ) {}

  take(key: string): RateDecision {
    const current = this.now()
    this.dropExpired(current)
    const window = this.windows.get(key)
    if (!window || current - window.startedAt >= this.windowMs) {
      this.open(key, current)
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

  private open(key: string, current: number): void {
    this.windows.delete(key)
    while (this.windows.size >= this.maxTrackedKeys) {
      const oldest = this.windows.keys().next()
      if (oldest.done) break
      this.windows.delete(oldest.value)
    }
    this.windows.set(key, { startedAt: current, count: 1 })
  }

  private dropExpired(current: number): void {
    for (const [key, window] of this.windows) {
      if (current - window.startedAt < this.windowMs) return
      this.windows.delete(key)
    }
  }
}
