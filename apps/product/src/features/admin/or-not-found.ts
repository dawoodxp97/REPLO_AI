import { notFound } from 'next/navigation'
import { apiErrorDetails } from '@/lib/api-error'

const NOT_FOUND_CODES: ReadonlySet<string> = new Set(['UNAUTHORIZED', 'FORBIDDEN', 'NOT_FOUND'])

export async function orNotFound<T>(promise: Promise<T>): Promise<T> {
  try {
    return await promise
  } catch (error) {
    const code = apiErrorDetails(error)?.code
    if (code && NOT_FOUND_CODES.has(code)) notFound()
    throw error
  }
}
