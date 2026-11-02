import { afterEach, describe, expect, it, vi } from 'vitest'
import { createShutdown } from './shutdown'

const log = () => ({ info: vi.fn(), error: vi.fn() })

afterEach(() => {
  vi.useRealTimers()
})

describe('createShutdown', () => {
  it('runs every step in order and exits 0', async () => {
    const calls: string[] = []
    const exit = vi.fn()
    const shutdown = createShutdown({
      steps: [
        { name: 'a', run: () => void calls.push('a') },
        { name: 'b', run: async () => void calls.push('b') },
      ],
      log: log(),
      timeoutMs: 1_000,
      exit,
    })
    await shutdown('SIGTERM')
    expect(calls).toEqual(['a', 'b'])
    expect(exit).toHaveBeenCalledExactlyOnceWith(0)
  })

  it('keeps going after a failing step and exits 1', async () => {
    const calls: string[] = []
    const exit = vi.fn()
    const logger = log()
    const shutdown = createShutdown({
      steps: [
        {
          name: 'boss',
          run: () => {
            throw new Error('boom')
          },
        },
        { name: 'pool', run: () => void calls.push('pool') },
      ],
      log: logger,
      timeoutMs: 1_000,
      exit,
    })
    await shutdown('SIGINT')
    expect(calls).toEqual(['pool'])
    expect(exit).toHaveBeenCalledExactlyOnceWith(1)
    expect(logger.error).toHaveBeenCalledWith(
      expect.objectContaining({ step: 'boss' }),
      'shutdown step failed',
    )
  })

  it('ignores a second signal while shutting down', async () => {
    const run = vi.fn()
    const exit = vi.fn()
    const shutdown = createShutdown({
      steps: [{ name: 'a', run }],
      log: log(),
      timeoutMs: 1_000,
      exit,
    })
    await Promise.all([shutdown('SIGTERM'), shutdown('SIGINT')])
    expect(run).toHaveBeenCalledTimes(1)
    expect(exit).toHaveBeenCalledTimes(1)
  })

  it('force exits with 1 when a step hangs past the timeout', async () => {
    vi.useFakeTimers()
    const exit = vi.fn()
    const shutdown = createShutdown({
      steps: [{ name: 'http', run: () => new Promise(() => undefined) }],
      log: log(),
      timeoutMs: 5_000,
      exit,
    })
    void shutdown('SIGTERM')
    await vi.advanceTimersByTimeAsync(4_999)
    expect(exit).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(exit).toHaveBeenCalledExactlyOnceWith(1)
  })
})
