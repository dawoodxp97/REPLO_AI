'use client'

import { FormField } from '@replo/ui'
import { useController, type Control } from 'react-hook-form'
import { BUDGET_ERROR, BudgetInput } from '@/components/budget-input'
import type { ImportFormValues } from './import-form-values'

export function BudgetField({ control }: { control: Control<ImportFormValues> }) {
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
