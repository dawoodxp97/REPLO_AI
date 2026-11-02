'use client'

import { useState, type ComponentType } from 'react'
import { useController, type Control } from 'react-hook-form'
import { RadioCardGroup } from '@/components/radio-card-group'
import type { ImportFormValues } from './import-form-values'
import { InstallationPicker } from './installation-picker'
import { PublicUrlField } from './public-url-field'
import { SOURCE_MODES, type SourceMode, type SourcePickerProps } from './source-modes'

const SOURCE_PICKERS: Record<SourceMode, ComponentType<SourcePickerProps>> = {
  public_url: PublicUrlField,
  installation: InstallationPicker,
}

export function SourceField({ control }: { control: Control<ImportFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'source' })
  const [mode, setMode] = useState<SourceMode>(field.value?.kind ?? 'public_url')
  const Picker = SOURCE_PICKERS[mode]

  function chooseMode(next: SourceMode) {
    setMode(next)
    field.onChange(undefined)
  }

  return (
    <div className="space-y-4">
      <RadioCardGroup
        name="source-mode"
        legend="Where is the repository?"
        options={SOURCE_MODES}
        value={mode}
        onChange={chooseMode}
      />
      <Picker
        value={field.value}
        onChange={field.onChange}
        missing={fieldState.error !== undefined && !field.value}
      />
    </div>
  )
}
