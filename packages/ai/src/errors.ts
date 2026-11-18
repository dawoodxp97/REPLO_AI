export function isRetryableProviderError(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false
  if ('isRetryable' in err && err.isRetryable === true) return true
  const statusCode = 'statusCode' in err ? err.statusCode : undefined
  const status = statusCode ?? ('status' in err ? err.status : undefined)
  if (status === 429 || (typeof status === 'number' && status >= 500)) return true
  const code = 'code' in err ? err.code : undefined
  const name = 'name' in err ? err.name : undefined
  return code === 'ETIMEDOUT' || code === 'ECONNRESET' || name === 'TimeoutError'
}