import type { Visibility } from '@replo/contracts'
import type { RadioCardOption } from '@/components/radio-card-group'
import { apiErrorDetails } from '@/lib/api-error'

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  private: 'Private',
  link: 'Shared by link',
  public: 'Public',
}

export const VISIBILITY_OPTIONS: readonly RadioCardOption<Visibility>[] = [
  { value: 'private', title: VISIBILITY_LABEL.private, description: 'Only you can read it.' },
  { value: 'link', title: VISIBILITY_LABEL.link, description: 'Anyone with the link can read it.' },
  {
    value: 'public',
    title: VISIBILITY_LABEL.public,
    description: 'Listed for everyone. Needs an open-source licence.',
  },
]

export function describeSharingError(error: unknown): string {
  if (apiErrorDetails(error)?.code === 'PUBLIC_REQUIRES_OPEN_LICENSE') {
    return 'Public tutorials need an open-source licence in the repository. Private and link sharing still work.'
  }
  return 'The visibility could not be changed. Try again.'
}
