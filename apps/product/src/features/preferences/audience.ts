import type { Audience } from '@replo/contracts'
import type { RadioCardOption } from '@/components/radio-card-group'

export const AUDIENCE_OPTIONS = [
  {
    value: 'newcomer',
    title: 'Newcomer',
    description: 'New to this codebase. Explains setup and the terms it uses.',
  },
  {
    value: 'intermediate',
    title: 'Intermediate',
    description: 'Comfortable with TypeScript. Focuses on how the parts fit together.',
  },
  {
    value: 'expert',
    title: 'Expert',
    description: 'Knows the stack. Goes straight to the design decisions.',
  },
] as const satisfies readonly RadioCardOption<Audience>[]

export const AUDIENCE_LABELS = Object.fromEntries(
  AUDIENCE_OPTIONS.map((option) => [option.value, option.title]),
) as Record<Audience, string>
