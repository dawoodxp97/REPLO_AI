import { ORPCError } from '@orpc/client'

export interface ApiErrorDetails {
  code: string
  data: unknown
}

export function apiErrorDetails(error: unknown): ApiErrorDetails | null {
  return error instanceof ORPCError ? { code: error.code, data: error.data } : null
}

export function isApiErrorCode(error: unknown, code: string): boolean {
  return apiErrorDetails(error)?.code === code
}

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
  const clientError = error instanceof ORPCError && error.status < 500
  return failureCount < 1 && !clientError
}
