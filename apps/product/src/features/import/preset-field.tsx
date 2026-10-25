import type { ModelPreset, PresetInfo } from '@replo/contracts'
import { Alert, Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useController, type Control } from 'react-hook-form'
import { RadioCardGroup, type RadioCardOption } from '@/components/radio-card-group'
import { orpc } from '@/lib/orpc'
import type { ImportFormValues } from './import-form-values'

export function PresetField({ control }: { control: Control<ImportFormValues> }) {
  const { field } = useController({ control, name: 'preset' })
  const catalog = useQuery(orpc.models.catalog.queryOptions())

  if (catalog.isPending) return <Skeleton aria-busy="true" className="h-32 w-full" />

  if (catalog.isError) {
    return (
      <Alert tone="destructive" role="alert">
        We could not load the model presets. Reload the page and try again.
      </Alert>
    )
  }

  return (
    <RadioCardGroup
      name="preset"
      legend="Model preset"
      options={toPresetOptions(catalog.data.presets)}
      value={field.value}
      onChange={field.onChange}
    />
  )
}

function toPresetOptions(presets: readonly PresetInfo[]): RadioCardOption<ModelPreset>[] {
  return presets
    .filter((preset) => preset.preset !== 'custom')
    .map((preset) => ({
      value: preset.preset,
      title: preset.label,
      description: preset.description,
    }))
}
