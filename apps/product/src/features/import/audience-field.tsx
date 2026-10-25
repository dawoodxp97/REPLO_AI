import type { Audience } from '@replo/contracts'
import { useController, type Control } from 'react-hook-form'
import { RadioCardGroup, type RadioCardOption } from '@/components/radio-card-group'
import type { ImportFormValues } from './import-form-values'

const AUDIENCE_OPTIONS = [
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

export function AudienceField({ control }: { control: Control<ImportFormValues> }) {
  const { field } = useController({ control, name: 'audience' })

  return (
    <RadioCardGroup
      name="audience"
      legend="Who is this tutorial for?"
      options={AUDIENCE_OPTIONS}
      value={field.value}
      onChange={field.onChange}
    />
  )
}
