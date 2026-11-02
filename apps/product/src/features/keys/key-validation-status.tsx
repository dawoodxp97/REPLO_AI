import { CircleAlert, CircleCheck } from 'lucide-react'
import { describeKeyError } from './key-errors'

export interface KeyValidationStatusProps {
  result: { valid: boolean } | undefined
  error: unknown
  isError: boolean
}

export function KeyValidationStatus({ result, error, isError }: KeyValidationStatusProps) {
  if (isError) {
    return (
      <p role="alert" className="flex items-center gap-1.5 text-[0.8125rem] text-destructive">
        <CircleAlert className="size-3.5" />
        {describeKeyError(error)}
      </p>
    )
  }
  if (!result) return null
  if (result.valid) {
    return (
      <p role="status" className="flex items-center gap-1.5 text-[0.8125rem] text-observed-text">
        <CircleCheck className="size-3.5" />
        The provider accepted this key.
      </p>
    )
  }
  return (
    <p role="status" className="flex items-center gap-1.5 text-[0.8125rem] text-destructive">
      <CircleAlert className="size-3.5" />
      The provider rejected this key.
    </p>
  )
}
