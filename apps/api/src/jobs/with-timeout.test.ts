import { describe, expect, it } from 'vitest'
import { withTimeout } from './with-timeout'

const never = () => new Promise<never>(() => {})

describe('withTimeout', () => {
  it('returns the handler result', async () => {
    await expect(withTimeout(1000, new AbortController().signal, async () => 7, 5)).resolves.toBe(7)
  })

  it('rejects with a TimeoutError when a handler ignores the signal', async () => {
    await expect(withTimeout(20, new AbortController().signal, never, 5)).rejects.toMatchObject({
      name: 'TimeoutError',
    })
  })

  it('rejects with the parent reason when canceled while the handler ignores the signal', async () => {
    const parent = new AbortController()
    const pending = withTimeout(1000, parent.signal, never, 5)
    const reason = new Error('canceled')
    parent.abort(reason)
    await expect(pending).rejects.toBe(reason)
  })

  it('rejects at once when the parent is already aborted', async () => {
    const parent = new AbortController()
    parent.abort(new Error('early'))
    await expect(withTimeout(1000, parent.signal, never, 5)).rejects.toThrow('early')
  })

  it('swallows a late rejection from the abandoned handler', async () => {
    let fail: (err: Error) => void = () => {}
    const pending = withTimeout(
      10,
      new AbortController().signal,
      () => new Promise<never>((_resolve, reject) => void (fail = reject)),
      5,
    )
    await expect(pending).rejects.toMatchObject({ name: 'TimeoutError' })
    fail(new Error('late'))
    await new Promise((resolve) => setTimeout(resolve, 10))
  })

  it('waits for a stage that ignores the signal to settle within the grace period before rejecting', async () => {
    const parent = new AbortController()
    const landed: string[] = []
    const pending = withTimeout(
      1000,
      parent.signal,
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 30))
        landed.push('side effect')
        throw new Error('stage failed late')
      },
      500,
    )
    const reason = new Error('canceled')
    parent.abort(reason)
    await expect(pending).rejects.toBe(reason)
    expect(landed).toEqual(['side effect'])
  })

  it('stops waiting once the grace period passes', async () => {
    const parent = new AbortController()
    const started = Date.now()
    const pending = withTimeout(1000, parent.signal, never, 40)
    parent.abort(new Error('canceled'))
    await expect(pending).rejects.toThrow('canceled')
    expect(Date.now() - started).toBeLessThan(500)
  })

  it('returns the value of a stage that finished while it was being aborted', async () => {
    const parent = new AbortController()
    const pending = withTimeout(
      1000,
      parent.signal,
      () => new Promise<number>((resolve) => setTimeout(() => resolve(3), 20)),
      500,
    )
    parent.abort(new Error('canceled'))
    await expect(pending).resolves.toBe(3)
  })
})
