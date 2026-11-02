export async function withTimeout<T>(
  ms: number,
  parent: AbortSignal,
  fn: (signal: AbortSignal) => Promise<T>,
  graceMs: number,
): Promise<T> {
  const signal = AbortSignal.any([parent, AbortSignal.timeout(ms)])
  let graceTimer: ReturnType<typeof setTimeout> | undefined
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
