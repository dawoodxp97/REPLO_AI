import { Alert, AlertDescription, Button } from '@replo/ui'
import { CircleAlert } from 'lucide-react'
import type { FormEventHandler, ReactNode } from 'react'

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
      {error ? (
        <Alert variant="destructive" role="alert">
          <CircleAlert />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  )
}
