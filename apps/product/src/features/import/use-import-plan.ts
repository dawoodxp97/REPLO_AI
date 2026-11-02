import { ImportRepositoryInput, RepositorySource } from '@replo/contracts'
import { useMemo } from 'react'
import { useWatch, type Control } from 'react-hook-form'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import type { ImportFormValues } from './import-form-values'

const ESTIMATE_DEBOUNCE_MS = 400

export function useImportPlan(control: Control<ImportFormValues>) {
  const values = useWatch({ control })
  const settledValues = useDebouncedValue(values, ESTIMATE_DEBOUNCE_MS)

  const plan = ImportRepositoryInput.safeParse(values)
  const source = RepositorySource.safeParse(values.source)
  const settledPlan = useMemo(() => ImportRepositoryInput.safeParse(settledValues), [settledValues])

  const settling = plan.success && settledValues !== values

  return {
    canSubmit: plan.success,
    source: source.success ? source.data : undefined,
    estimateInput: plan.success && settledPlan.success ? settledPlan.data : undefined,
    settling,
  }
}
