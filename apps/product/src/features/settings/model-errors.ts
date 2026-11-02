import { createErrorDescriber } from '@/lib/error-copy'

export const describeModelError = createErrorDescriber({
  CUSTOM_MODEL_NOT_ALLOWED: 'That model is not verified for this role. Pick another one.',
  BAD_REQUEST: 'Enter a budget from $0.01 to $50, or leave it empty.',
})
