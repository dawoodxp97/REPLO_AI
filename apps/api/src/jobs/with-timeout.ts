import { STAGE_ABORT_GRACE_MS } from './schemas'

type Outcome<T> = { value: T } | { error: unknown }

export async function withTimeout<T>(
  ms: number,
  parent: AbortSignal,
  fn: (signal: AbortSignal) => Promise<T>,
  graceMs: number = STAGE_ABORT_GRACE_MS,
): Promise<T> {
  const controller = new AbortController()
  const { signal } = controller
  const onParentAbort = () => controller.abort(parent.reason)
  if (parent.aborted) controller.abort(parent.reason)
  else parent.addEventListener('abort', onParentAbort, { once: true })
  const timer = setTimeout(
    () => controller.abort(new DOMException(`Stage timed out after ${ms}ms`, 'TimeoutError')),
    ms,
  )
  const aborted = new Promise<void>((resolve) => {
    if (signal.aborted) resolve()
    else signal.addEventListener('abort', () => resolve(), { once: true })
  })
  let graceTimer: ReturnType<typeof setTimeout> | undefined
  try {
    const box: { outcome?: Outcome<T> } = {}
    const settled = (async () => fn(signal))().then(
      (value) => void (box.outcome = { value }),
      (error: unknown) => void (box.outcome = { error }),
    )
    await Promise.race([settled, aborted])
    if (!box.outcome) {
      const grace = new Promise<void>((resolve) => {
        graceTimer = setTimeout(resolve, graceMs)
      })
      await Promise.race([settled, grace])
    }
    const { outcome } = box
    if (outcome && 'value' in outcome) return outcome.value
    if (signal.aborted) throw signal.reason
    if (outcome) throw outcome.error
    throw new Error('stage ended without an outcome')
  } finally {
    clearTimeout(timer)
    clearTimeout(graceTimer)
    parent.removeEventListener('abort', onParentAbort)
  }
}
