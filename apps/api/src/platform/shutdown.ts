import type { Logger } from 'pino'

export interface ShutdownStep {
  name: string
  run(): Promise<unknown> | unknown
}

export interface ShutdownOptions {
  steps: readonly ShutdownStep[]
  log: Pick<Logger, 'info' | 'error'>
  timeoutMs: number
  exit?: (code: number) => void
}

const SIGNALS = ['SIGTERM', 'SIGINT'] as const

export function createShutdown(options: ShutdownOptions): (signal: string) => Promise<void> {
  const exit = options.exit ?? ((code: number) => process.exit(code))
  let started = false

  return async (signal) => {
    if (started) return
    started = true
    options.log.info({ signal }, 'shutting down')

    const timer = setTimeout(() => {
      options.log.error({ timeoutMs: options.timeoutMs }, 'shutdown timed out')
      exit(1)
    }, options.timeoutMs)
    timer.unref()

    let failed = false
    for (const step of options.steps) {
      try {
        await step.run()
      } catch (err) {
        failed = true
        options.log.error({ err, step: step.name }, 'shutdown step failed')
      }
    }

    clearTimeout(timer)
    exit(failed ? 1 : 0)
  }
}

export function installShutdown(options: ShutdownOptions): void {
  const shutdown = createShutdown(options)
  for (const signal of SIGNALS) process.on(signal, () => void shutdown(signal))
}
