import { Button } from '@replo/ui'
import { ErrorPanel } from '@/components/error-panel'
import { LinkButton } from '@/components/link-button'
import { isApiErrorCode } from '@/lib/api-error'

export type ProgressErrorSubject = 'tutorial' | 'progress'

export interface ProgressErrorProps {
  subject: ProgressErrorSubject
  error: unknown
  retry: () => unknown
}

function RetryButton({ retry }: { retry: () => unknown }) {
  return (
    <Button variant="outline" size="sm" onClick={() => void retry()}>
      Try again
    </Button>
  )
}

export function ProgressError({ subject, error, retry }: ProgressErrorProps) {
  if (subject === 'tutorial') {
    return isApiErrorCode(error, 'NOT_FOUND') ? (
      <ErrorPanel
        title="This tutorial is not available"
        description="Check the link, or return to the tutorial overview."
      />
    ) : (
      <ErrorPanel
        title="The tutorial could not be loaded"
        description="Check your connection, then try again."
        action={<RetryButton retry={retry} />}
      />
    )
  }

  return isApiErrorCode(error, 'UNAUTHORIZED') ? (
    <ErrorPanel
      title="Sign in to see your progress"
      description="Progress is saved to your account for each tutorial."
      action={
        <LinkButton href="/login" variant="outline" size="sm">
          Sign in
        </LinkButton>
      }
    />
  ) : (
    <ErrorPanel
      title="Progress could not be loaded"
      description="Check your connection, then try again."
      action={<RetryButton retry={retry} />}
    />
  )
}
