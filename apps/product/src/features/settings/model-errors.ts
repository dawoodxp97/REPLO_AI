import { apiErrorDetails } from '@/lib/api-error'

export function describeModelError(error: unknown): string {
  return apiErrorDetails(error)?.code === 'CUSTOM_MODEL_NOT_ALLOWED'
    ? 'That model is not verified for this role. Pick another one.'
    : 'The models could not be saved. Check your connection and try again.'
}
