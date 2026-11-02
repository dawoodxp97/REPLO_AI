'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ImportRepositoryInput, type RepositorySource } from '@replo/contracts'
import { Button } from '@replo/ui'
import { useForm } from 'react-hook-form'
import { InlineError } from '@/components/inline-error'
import { AudienceField } from './audience-field'
import { BudgetField } from './budget-field'
import { EstimateCard } from './estimate-card'
import { describeImportError } from './import-errors'
import { IMPORT_FORM_DEFAULTS, type ImportFormValues } from './import-form-values'
import { ImportSection } from './import-section'
import { KeyField } from './key-field'
import { PreflightPanel } from './preflight-panel'
import { PresetField } from './preset-field'
import { SourceField } from './source-field'
import { useImportDefaults } from './use-import-defaults'
import { useImportPlan } from './use-import-plan'
import { useStartImport } from './use-start-import'

export function ImportForm({ initialSource }: { initialSource?: RepositorySource }) {
  const form = useForm<ImportFormValues, unknown, ImportRepositoryInput>({
    resolver: zodResolver(ImportRepositoryInput),
    defaultValues: { ...IMPORT_FORM_DEFAULTS, source: initialSource },
  })
  useImportDefaults(form)
  const { canSubmit, source, estimateInput, settling } = useImportPlan(form.control)
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
      <div>
        <Button type="submit" disabled={!canSubmit || startImport.isPending}>
          {startImport.isPending ? 'Starting…' : 'Generate tutorial'}
        </Button>
      </div>
    </form>
  )
}
