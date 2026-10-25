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

export function classifyError(err: unknown): ClassifiedError {
  if (err instanceof JobError)
    return { code: err.code, retryable: err.retryable, detail: { message: err.message } }
  const fields: Record<string, unknown> = isRecord(err) ? err : {}
  const message = typeof fields.message === 'string' ? fields.message : 'Unknown error'
  const status = fields.statusCode ?? fields.status
  if (fields.name === 'TimeoutError' || fields.name === 'AbortError')
    return { code: 'TIMEOUT', retryable: true, detail: { message } }
  if (status === 429 || (typeof status === 'number' && status >= 500))
    return { code: 'PROVIDER_UNAVAILABLE', retryable: true, detail: { message } }
  if (fields.code === 'ETIMEDOUT' || fields.code === 'ECONNRESET' || fields.code === 'ENOTFOUND')
    return { code: 'NETWORK', retryable: true, detail: { message } }
  if (err instanceof BudgetExceededError)
    return { code: 'BUDGET_EXCEEDED', retryable: false, detail: { message } }
  return { code: 'INTERNAL', retryable: false, detail: { message } }
}
