import { FormField, Input } from '@replo/ui'
import type { ComponentProps, ReactNode } from 'react'
import { fieldInvalid } from '@/lib/field-a11y'

export interface TextFieldProps extends ComponentProps<typeof Input> {
  id: string
  label: ReactNode
  hint?: ReactNode
  error?: string
}

export function TextField({ id, label, hint, error, ...inputProps }: TextFieldProps) {
  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <Input id={id} {...fieldInvalid(error)} {...inputProps} />
    </FormField>
  )
}
