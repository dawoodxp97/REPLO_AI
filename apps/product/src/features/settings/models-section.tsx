'use client'

import type { CustomModels, ModelCatalog } from '@replo/contracts'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Select,
  Skeleton,
} from '@replo/ui'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { PROVIDER_LABELS } from '@/features/keys/providers'
import { apiErrorDetails } from '@/lib/api-error'
import { orpc } from '@/lib/orpc'

const ROLES: readonly { role: keyof CustomModels; label: string }[] = [
  { role: 'planner', label: 'Planner' },
  { role: 'author', label: 'Author' },
  { role: 'summarizer', label: 'Summarizer' },
]

export function ModelsSection() {
  const catalog = useQuery(orpc.models.catalog.queryOptions())
  const preferences = useQuery(orpc.models.getPreferences.queryOptions())

  if (catalog.isPending || preferences.isPending)
    return <Skeleton aria-busy="true" className="h-64 w-full" />
  if (catalog.isError || preferences.isError || !catalog.data || !preferences.data) {
    return (
      <ErrorPanel
        title="We could not load your models"
        description="Check your connection, then reload."
      />
    )
  }

  return (
    <ModelsForm
      key={JSON.stringify(preferences.data)}
      catalog={catalog.data}
      initialPreset={preferences.data.preset}
      initialBudget={preferences.data.defaultBudgetUsd}
      initialCustom={preferences.data.customModels ?? {}}
    />
  )
}

function ModelsForm({
  catalog,
  initialPreset,
  initialBudget,
  initialCustom,
}: {
  catalog: ModelCatalog
  initialPreset: ModelCatalog['presets'][number]['preset']
  initialBudget: number | null
  initialCustom: CustomModels
}) {
  const queryClient = useQueryClient()
  const [preset, setPreset] = useState(initialPreset)
  const [budget, setBudget] = useState(initialBudget === null ? '' : String(initialBudget))
  const [custom, setCustom] = useState<CustomModels>(initialCustom)
  const save = useMutation(
    orpc.models.setPreferences.mutationOptions({
      onSuccess: () => queryClient.invalidateQueries({ queryKey: orpc.models.key() }),
    }),
  )
  const verified = catalog.models.filter(
    (model) => model.verified && model.supportsStructuredOutput,
  )

  function submit() {
    const trimmed = budget.trim()
    save.mutate({
      preset,
      customModels: preset === 'custom' ? custom : null,
      defaultBudgetUsd: trimmed === '' ? null : Number(trimmed),
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Models and budget</CardTitle>
        <CardDescription>
          Replo never picks a model for you silently. Pick a preset, or one verified model per role.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <FormField id="preset" label="Preset">
          <Select
            id="preset"
            value={preset}
            onChange={(event) => setPreset(parsePreset(event.target.value, catalog))}
          >
            {catalog.presets.map((item) => (
              <option key={item.preset} value={item.preset}>
                {item.label}
              </option>
            ))}
          </Select>
        </FormField>

        {preset === 'custom' ? (
          <div className="grid gap-5 sm:grid-cols-3">
            {ROLES.map(({ role, label }) => (
              <FormField key={role} id={`model-${role}`} label={label}>
                <Select
                  id={`model-${role}`}
                  value={custom[role] ?? ''}
                  onChange={(event) =>
                    setCustom({
                      ...custom,
                      [role]: event.target.value === '' ? undefined : event.target.value,
                    })
                  }
                >
                  <option value="">Use the preset&apos;s choice</option>
                  {verified.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label} · {PROVIDER_LABELS[model.provider]}
                    </option>
                  ))}
                </Select>
              </FormField>
            ))}
          </div>
        ) : null}

        <FormField
          id="budget"
          label="Default budget ceiling (USD)"
          hint="Each job stops at this amount. Leave it empty to use the default."
        >
          <Input
            id="budget"
            type="number"
            inputMode="decimal"
            min={0.01}
            max={50}
            step={0.01}
            value={budget}
            onChange={(event) => setBudget(event.target.value)}
          />
        </FormField>

        <div className="flex flex-wrap items-center gap-3">
          <Button disabled={save.isPending} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save models'}
          </Button>
          {save.isSuccess ? (
            <span role="status" className="text-sm text-muted-foreground">
              Saved.
            </span>
          ) : null}
        </div>
        {save.isError ? (
          <Alert tone="destructive" role="alert">
            {describeModelError(save.error)}
          </Alert>
        ) : null}
      </CardContent>
    </Card>
  )
}

function parsePreset(
  value: string,
  catalog: ModelCatalog,
): ModelCatalog['presets'][number]['preset'] {
  return catalog.presets.find((item) => item.preset === value)?.preset ?? 'balanced'
}

function describeModelError(error: unknown): string {
  return apiErrorDetails(error)?.code === 'CUSTOM_MODEL_NOT_ALLOWED'
    ? 'That model is not verified for this role. Pick another one.'
    : 'The models could not be saved. Try again.'
}
