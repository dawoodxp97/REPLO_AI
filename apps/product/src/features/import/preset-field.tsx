'use client'

import type { ModelPreset, PresetInfo } from '@replo/contracts'
import { Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useController, type Control } from 'react-hook-form'
import { QueryBoundary } from '@/components/query-boundary'
import { RadioCardGroup, type RadioCardOption } from '@/components/radio-card-group'
import { orpc } from '@/lib/orpc'
import type { ImportFormValues } from './use-import-form'

export function PresetField({ control }: { control: Control<ImportFormValues> }) {
  const { field } = useController({ control, name: 'preset' })
  const catalog = useQuery(orpc.models.catalog.queryOptions())
  const preferences = useQuery(orpc.models.getPreferences.queryOptions())
  const allowCustom = Boolean(preferences.data?.customModels)

  return (
    <QueryBoundary
      query={catalog}
      errorTitle="We could not load the model presets"
      loading={<Skeleton aria-busy="true" className="h-24 w-full" />}
    >
      {({ presets }) => (
        <RadioCardGroup
          name="preset"
          columns={2}
          legend="Model preset"
          options={toPresetOptions(presets, allowCustom)}
          value={field.value}
          onChange={field.onChange}
        />
      )}
    </QueryBoundary>
  )
}

function toPresetOptions(
  presets: readonly PresetInfo[],
  allowCustom: boolean,
): RadioCardOption<ModelPreset>[] {
  return presets
    .filter((preset) => allowCustom || preset.preset !== 'custom')
    .map((preset) => ({
      value: preset.preset,
      title: preset.label,
      description: preset.description,
    }))
}
