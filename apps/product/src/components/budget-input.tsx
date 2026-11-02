import { MAX_BUDGET_USD } from '@replo/contracts'
import { Input } from '@replo/ui'
import type { ComponentProps } from 'react'
import { fieldInvalid } from '@/lib/field-a11y'

export const MIN_BUDGET_USD = 0.01
export const BUDGET_ERROR = `Enter an amount from $${MIN_BUDGET_USD} to $${MAX_BUDGET_USD}.`

export function isValidBudget(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_BUDGET_USD && value <= MAX_BUDGET_USD
}

export function BudgetInput({
  error,
  className,
  ...props
}: Omit<ComponentProps<typeof Input>, 'type' | 'inputMode' | 'min' | 'max' | 'step'> & {
  error?: string | undefined
}) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      min={MIN_BUDGET_USD}
      max={MAX_BUDGET_USD}
      step={0.01}
      className={className}
      {...fieldInvalid(error)}
      {...props}
    />
  )
}
