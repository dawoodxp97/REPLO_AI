import { createErrorDescriber, type ErrorCopy } from '@/lib/error-copy'

export const KEY_ERROR_COPY = {
  KEY_INVALID: 'The provider rejected this key. Check that it is copied in full and still active.',
  KEY_ALREADY_EXISTS: 'You already saved this key for this provider.',
  KEY_CHECK_UNAVAILABLE: 'The provider did not answer the key check. Try again in a few minutes.',
} as const satisfies ErrorCopy

export const describeKeyError = createErrorDescriber(KEY_ERROR_COPY)
