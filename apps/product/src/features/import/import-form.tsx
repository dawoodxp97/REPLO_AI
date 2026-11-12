'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ImportRepositoryInput, type RepositorySource } from '@replo/contracts'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
} from '@replo/ui'
import type { ReactNode } from 'react'
import { useController, useForm, type Control } from 'react-hook-form'
import { BUDGET_ERROR, BudgetInput } from '@/components/budget-input'
import { InlineError } from '@/components/inline-error'
import { RadioCardGroup } from '@/components/radio-card-group'
import { AUDIENCE_OPTIONS } from '@/features/preferences/audience'
import { EstimateCard } from './estimate-card'
import { describeImportError } from './import-errors'
import { KeyField } from './key-field'
import { PreflightPanel } from './preflight-panel'
import { PresetField } from './preset-field'
import { SourceField } from './source-field'
import {
  IMPORT_FORM_DEFAULTS,
  useImportDefaults,
  useImportPlan,
  useStartImport,
  type ImportFormValues,
} from './use-import-form'

export function ImportForm({ initialSource }: { initialSource?: RepositorySource }) {
  const form = useForm<ImportFormValues, unknown, ImportRepositoryInput>({
    resolver: zodResolver(ImportRepositoryInput),
    defaultValues: { ...IMPORT_FORM_DEFAULTS, source: initialSource },
  })
  useImportDefaults(form)
  const { canSubmit, blocker, source, estimateInput, settling } = useImportPlan(form.control)
  const startImport = useStartImport()

  return (
    <form
      noValidate
      className="space-y-6"
      onSubmit={form.handleSubmit((input) => startImport.mutate(input))}
    >
      <ImportSection
        title="Repository"
        description="Choose what to teach and check that it can be read."
      >
        <SourceField control={form.control} />
        <PreflightPanel source={source} />
      </ImportSection>
      <ImportSection
        title="Model"
        description="The key that pays for the run and the models it uses."
      >
        <KeyField control={form.control} />
        <PresetField control={form.control} />
      </ImportSection>
      <ImportSection
        title="Tutorial"
        description="Who it is written for and how much it may spend."
      >
        <AudienceField control={form.control} />
        <BudgetField control={form.control} />
      </ImportSection>
      <EstimateCard input={estimateInput} settling={settling} />
      {startImport.isError ? (
        <InlineError>{describeImportError(startImport.error)}</InlineError>
      ) : null}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-background/95 py-3 backdrop-blur-sm">
        <Button type="submit" disabled={!canSubmit || startImport.isPending}>
          {startImport.isPending ? 'Starting…' : 'Generate tutorial'}
        </Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {blocker ?? 'Ready. Check the estimate above, then generate.'}
        </p>
      </div>
    </form>
  )
}

interface ImportSectionProps {
  title: string
  description: string
  children: ReactNode
}

function ImportSection({ title, description, children }: ImportSectionProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">{children}</CardContent>
    </Card>
  )
}

function AudienceField({ control }: { control: Control<ImportFormValues> }) {
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

function BudgetField({ control }: { control: Control<ImportFormValues> }) {
  const { field, fieldState } = useController({ control, name: 'budgetUsd' })
  const error = fieldState.error ? BUDGET_ERROR : undefined

  return (
    <FormField
      id="budget"
      label="Budget ceiling (USD)"
      hint="Optional. The job stops when it reaches this amount. Leave it empty for the default."
      error={error}
    >
      <BudgetInput
        id="budget"
        error={error}
        placeholder="Default"
        className="tabular sm:max-w-48"
        value={field.value ?? ''}
        onChange={(event) =>
          field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
        }
      />
    </FormField>
  )
}
