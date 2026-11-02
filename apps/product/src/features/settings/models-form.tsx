'use client'

import type { CustomModels, ModelCatalog, ModelPreferences } from '@replo/contracts'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  FieldGroup,
  FormField,
  NativeSelect,
} from '@replo/ui'
import { BudgetInput } from '@/components/budget-input'
import { InlineError } from '@/components/inline-error'
import { LLM_PROVIDER_LABELS } from '@/features/keys/providers'
import { describeModelError } from './model-errors'
import { useModelsForm } from './use-models-form'

const ROLES: readonly { role: keyof CustomModels; label: string }[] = [
  { role: 'planner', label: 'Planner' },
  { role: 'author', label: 'Author' },
  { role: 'summarizer', label: 'Summarizer' },
]

function parsePreset(value: string, catalog: ModelCatalog): ModelPreferences['preset'] {
  return catalog.presets.find((item) => item.preset === value)?.preset ?? 'balanced'
}

export function ModelsForm({
  catalog,
  initial,
}: {
  catalog: ModelCatalog
  initial: ModelPreferences
}) {
  const form = useModelsForm(initial)
  const { save } = form
  const verified = catalog.models.filter(
    (model) => model.verified && model.supportsStructuredOutput,
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Models and budget</CardTitle>
        <CardDescription>
          Replo never picks a model for you silently. Pick a preset, or one verified model per role.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FieldGroup className="gap-5">
          <FormField id="preset" label="Preset">
            <NativeSelect
              id="preset"
              value={form.preset}
              onChange={(event) => form.setPreset(parsePreset(event.target.value, catalog))}
            >
              {catalog.presets.map((item) => (
                <option key={item.preset} value={item.preset}>
                  {item.label}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          {form.preset === 'custom' ? (
            <div className="grid gap-5 sm:grid-cols-3">
              {ROLES.map(({ role, label }) => (
                <FormField key={role} id={`model-${role}`} label={label}>
                  <NativeSelect
                    id={`model-${role}`}
                    value={form.custom[role] ?? ''}
                    onChange={(event) => form.setCustomModel(role, event.target.value)}
                  >
                    <option value="">Use the preset&apos;s choice</option>
                    {verified.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label} · {LLM_PROVIDER_LABELS[model.provider]}
                      </option>
                    ))}
                  </NativeSelect>
                </FormField>
              ))}
            </div>
          ) : null}

          <FormField
            id="budget"
            label="Default budget ceiling (USD)"
            hint="Each job stops at this amount. Leave it empty to use the default."
            error={form.budgetError}
          >
            <BudgetInput
              id="budget"
              error={form.budgetError}
              value={form.budget}
              onChange={(event) => form.setBudget(event.target.value)}
              className="max-w-40 font-mono tabular"
            />
          </FormField>

          {save.isError ? <InlineError>{describeModelError(save.error)}</InlineError> : null}
        </FieldGroup>
      </CardContent>
      <CardFooter className="gap-3">
        <Button disabled={save.isPending} onClick={form.submit}>
          {save.isPending ? 'Saving…' : 'Save models'}
        </Button>
        {save.isSuccess ? (
          <span role="status" className="text-sm text-muted-foreground">
            Saved.
          </span>
        ) : null}
      </CardFooter>
    </Card>
  )
}
