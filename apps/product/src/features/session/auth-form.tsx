import { Button } from '@replo/ui'
import type { FormEventHandler, ReactNode } from 'react'
import { InlineError } from '@/components/inline-error'

export interface AuthFormProps {
  onSubmit: FormEventHandler<HTMLFormElement>
  error: string | null
  pending: boolean
  submitLabel: string
  pendingLabel: string
  children: ReactNode
}

export function AuthForm({
  onSubmit,
  error,
  pending,
  submitLabel,
  pendingLabel,
  children,
}: AuthFormProps) {
  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={onSubmit}>
      {children}
      {error ? <InlineError>{error}</InlineError> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  )
}
