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
  NativeSelect,
} from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { useController, useForm, type Control } from 'react-hook-form'
import { InlineError } from '@/components/inline-error'
import { RadioCardGroup } from '@/components/radio-card-group'
import { AUDIENCE_OPTIONS } from '@/features/preferences/audience'
import { LLM_PROVIDER_LABELS } from '@/features/keys/providers'
import { orpc } from '@/lib/orpc'
import { describeImportError } from './import-errors'
import { KeyField } from './key-field'
import { PreflightPanel } from './preflight-panel'
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
  const { canSubmit, blocker, source } = useImportPlan(form.control)
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
        description="The key that pays for the run and the model it uses."
      >
        <KeyField control={form.control} />
        <ModelField control={form.control} />
      </ImportSection>
      <ImportSection title="Course" description="Who it is written for.">
        <AudienceField control={form.control} />
      </ImportSection>
      {startImport.isError ? (
        <InlineError>{describeImportError(startImport.error)}</InlineError>
      ) : null}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2 border-t bg-background/95 py-3 backdrop-blur-sm">
        <Button type="submit" disabled={!canSubmit || startImport.isPending}>
          {startImport.isPending ? 'Starting…' : 'Generate course'}
        </Button>
        <p className="text-sm text-muted-foreground" aria-live="polite">
          {blocker ?? 'Ready to generate.'}
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
      legend="Who is this course for?"
      options={AUDIENCE_OPTIONS}
      value={field.value}
      onChange={field.onChange}
    />
  )
}

function ModelField({ control }: { control: Control<ImportFormValues> }) {
  const { field } = useController({ control, name: 'modelId' })
  const catalog = useQuery(orpc.models.catalog.queryOptions())
  const models = (catalog.data?.models ?? []).filter(
    (model) => model.verified && model.supportsStructuredOutput,
  )

  return (
    <FormField
      id="model"
      label="Model"
      hint="One model runs the whole course. Free models are billed to your provider as $0."
    >
      <NativeSelect
        id="model"
        value={field.value}
        onChange={(event) => field.onChange(event.target.value)}
        disabled={catalog.isPending}
      >
        <option value="">Choose a model</option>
        {models.map((model) => (
          <option key={model.id} value={model.id}>
            {model.label} · {LLM_PROVIDER_LABELS[model.provider]}
            {model.free ? ' · free' : ''}
          </option>
        ))}
      </NativeSelect>
    </FormField>
  )
}
