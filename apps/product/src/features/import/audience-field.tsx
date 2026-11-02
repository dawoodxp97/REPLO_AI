'use client'

import { useController, type Control } from 'react-hook-form'
import { RadioCardGroup } from '@/components/radio-card-group'
import { AUDIENCE_OPTIONS } from '@/features/preferences/audience'
import type { ImportFormValues } from './import-form-values'

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
