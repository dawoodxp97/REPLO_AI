export async function withTimeout<T>(
  ms: number,
  parent: AbortSignal,
  fn: (signal: AbortSignal) => Promise<T>,
  graceMs: number,
): Promise<T> {
  const signal = AbortSignal.any([parent, AbortSignal.timeout(ms)])
  let graceTimer: ReturnType<typeof setTimeout> | undefined
  // An aborted stage gets graceMs to settle, then we stop waiting so a hung call cannot
  // hold the worker. It may still finish later, so stages throwIfAborted before writing.
  const abandoned = new Promise<never>((_resolve, reject) => {
    const giveUpAfterGrace = () => {
      graceTimer = setTimeout(() => reject(signal.reason), graceMs)
    }
    if (signal.aborted) giveUpAfterGrace()
    else signal.addEventListener('abort', giveUpAfterGrace, { once: true })
  })
  try {
    return await Promise.race([fn(signal), abandoned])
  } catch (error) {
    throw signal.aborted ? signal.reason : error
  } finally {
    clearTimeout(graceTimer)
  }
}
