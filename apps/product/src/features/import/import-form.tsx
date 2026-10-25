'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ImportRepositoryInput, RepositorySource } from '@replo/contracts'
import { Alert, Button } from '@replo/ui'
import { useForm, useWatch } from 'react-hook-form'
import { AudienceField } from './audience-field'
import { BudgetField } from './budget-field'
import { EstimateCard } from './estimate-card'
import { describeImportError } from './import-errors'
import { IMPORT_FORM_DEFAULTS, type ImportFormValues } from './import-form-values'
import { KeyField } from './key-field'
import { PresetField } from './preset-field'
import { PreflightPanel } from './preflight-panel'
import { SourceField } from './source-field'
import { useStartImport } from './use-start-import'

export function ImportForm() {
  const form = useForm<ImportFormValues, unknown, ImportRepositoryInput>({
    resolver: zodResolver(ImportRepositoryInput),
    defaultValues: IMPORT_FORM_DEFAULTS,
  })
  const values = useWatch({ control: form.control })
  const plan = ImportRepositoryInput.safeParse(values)
  const source = RepositorySource.safeParse(values.source)
  const startImport = useStartImport()

  return (
    <form
      noValidate
      className="space-y-8"
      onSubmit={form.handleSubmit((input) => startImport.mutate(input))}
    >
      <SourceField control={form.control} />
      <PreflightPanel source={source.success ? source.data : undefined} />
      <KeyField control={form.control} />
      <PresetField control={form.control} />
      <AudienceField control={form.control} />
      <BudgetField control={form.control} />
      <EstimateCard input={plan.success ? plan.data : undefined} />
      {startImport.isError ? (
        <Alert tone="destructive" role="alert">
          {describeImportError(startImport.error)}
        </Alert>
      ) : null}
      <Button type="submit" size="lg" disabled={!plan.success || startImport.isPending}>
        {startImport.isPending ? 'Starting…' : 'Generate tutorial'}
      </Button>
    </form>
  )
}
