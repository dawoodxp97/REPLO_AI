import { BudgetExceededError } from '@replo/ai'

export class JobError extends Error {
  constructor(
    readonly code: string,
    readonly retryable: boolean,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'JobError'
  }
}

export class StoppedError extends JobError {
  constructor() {
    super('STOPPED', false, 'job was finished by another action')
  }
}

export class CanceledError extends JobError {
  constructor() {
    super('CANCELED', false)
  }
}

export interface ClassifiedError {
  code: string
  retryable: boolean
  detail: { message: string }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

const SAFE_MESSAGES: Record<string, string> = {
  TIMEOUT: 'The operation timed out',
  PROVIDER_UNAVAILABLE: 'The model provider was unavailable',
  NETWORK: 'A network error occurred',
  BUDGET_EXCEEDED: 'The run budget was exceeded',
  INTERNAL: 'An internal error occurred',
}

const classified = (code: string, retryable: boolean): ClassifiedError => ({
  code,
  retryable,
  detail: { message: SAFE_MESSAGES[code] ?? SAFE_MESSAGES.INTERNAL! },
})

export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof JobError)
    return { code: err.code, retryable: err.retryable, detail: { message: err.message } }
  const fields: Record<string, unknown> = isRecord(err) ? err : {}
  const status = fields.statusCode ?? fields.status
  if (fields.name === 'TimeoutError' || fields.name === 'AbortError')
    return classified('TIMEOUT', true)
  if (status === 429 || (typeof status === 'number' && status >= 500))
    return classified('PROVIDER_UNAVAILABLE', true)
  if (fields.code === 'ETIMEDOUT' || fields.code === 'ECONNRESET' || fields.code === 'ENOTFOUND')
    return classified('NETWORK', true)
  if (err instanceof BudgetExceededError) return classified('BUDGET_EXCEEDED', false)
  return classified('INTERNAL', false)
}
