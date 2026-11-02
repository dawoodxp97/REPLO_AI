'use client'

import { Button } from '@replo/ui'
import { ErrorPanel } from '@/components/error-panel'

export default function OperatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorPanel
      title="Operator data could not be loaded"
      description={
        <>
          The request failed for a reason other than access. Try again, then check the API logs.
          {error.digest ? (
            <>
              {' '}
              Reference <span className="font-mono">{error.digest}</span>.
            </>
          ) : null}
        </>
      }
      action={
        <Button variant="outline" size="sm" onClick={reset}>
          Try again
        </Button>
      }
    />
  )
}
