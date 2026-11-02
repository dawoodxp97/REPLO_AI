'use client'

import { FormField, Input } from '@replo/ui'
import { useController, type Control } from 'react-hook-form'
import { fieldInvalid } from '@/lib/field-a11y'
import type { ImportFormValues } from './import-form-values'

const BUDGET_ERROR = 'Enter an amount from $0.01 to $50.'

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
      <Input
        id="budget"
        type="number"
        inputMode="decimal"
        min={0.01}
        max={50}
        step={0.01}
        placeholder="Default"
        className="tabular sm:max-w-48"
        {...fieldInvalid(error)}
        value={field.value ?? ''}
        onChange={(event) =>
          field.onChange(event.target.value === '' ? undefined : event.target.valueAsNumber)
        }
      />
    </FormField>
  )
}
