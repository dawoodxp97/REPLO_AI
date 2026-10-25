export async function withTimeout<T>(
  ms: number,
  parent: AbortSignal,
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
  const controller = new AbortController()
  const onParentAbort = () => controller.abort(parent.reason)
  if (parent.aborted) controller.abort(parent.reason)
  else parent.addEventListener('abort', onParentAbort, { once: true })
  const timer = setTimeout(
    () => controller.abort(new DOMException(`Stage timed out after ${ms}ms`, 'TimeoutError')),
    ms,
  )
  try {
    return await fn(controller.signal)
  } finally {
    clearTimeout(timer)
    parent.removeEventListener('abort', onParentAbort)
  }
}
