import { apiErrorDetails } from '@/lib/api-error'

const GENERIC_ERROR = 'Something went wrong. Try again.'

const KEY_ERROR_COPY: Record<string, string> = {
  KEY_INVALID: 'The provider rejected this key. Check that you copied it in full.',
  KEY_ALREADY_EXISTS: 'You already saved this key for this provider.',
  KEY_CHECK_UNAVAILABLE: 'The provider did not answer the key check. Try again in a few minutes.',
}

export function describeKeyError(error: unknown): string {
  const details = apiErrorDetails(error)
  if (!details) return GENERIC_ERROR
  return KEY_ERROR_COPY[details.code] ?? GENERIC_ERROR
}
