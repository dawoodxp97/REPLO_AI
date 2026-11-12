'use client'

import { RepositorySource } from '@replo/contracts'
import { useState, type ComponentType } from 'react'
import { useController, type Control } from 'react-hook-form'
import { RadioCardGroup } from '@/components/radio-card-group'
import { TextField } from '@/components/text-field'
import { InstallationPicker } from './installation-picker'
import {
  MISSING_SOURCE_ERROR,
  SOURCE_MODES,
  type SourceMode,
  type SourcePickerProps,
} from './source-modes'
import type { ImportFormValues } from './use-import-form'

const URL_ERROR = 'Use a link such as https://github.com/owner/repo'

function PublicUrlField({ value, onChange, missing }: SourcePickerProps) {
  const url = value?.kind === 'public_url' ? value.url : ''
  const malformed = url !== '' && !RepositorySource.safeParse({ kind: 'public_url', url }).success
  const error = malformed ? URL_ERROR : missing ? MISSING_SOURCE_ERROR : undefined

  return (
    <TextField
      id="repo-url"
      label="GitHub repository URL"
      hint="Public repositories only. Private repositories need the GitHub App."
      error={error}
      type="url"
      inputMode="url"
      autoComplete="off"
      spellCheck={false}
      placeholder="https://github.com/owner/repo"
      value={url}
      onChange={(event) => onChange({ kind: 'public_url', url: event.target.value.trim() })}
    />
  )
}

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
