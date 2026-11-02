import type { TutorialRef } from '@replo/contracts'
import { Alert, AlertDescription, AlertTitle } from '@replo/ui'
import { CircleCheck } from 'lucide-react'
import { LinkButton } from '@/components/link-button'
import { tutorialPath } from '@/lib/tutorial-paths'

export function TutorialReady({ tutorial }: { tutorial: TutorialRef | null }) {
  return (
    <Alert variant="observed">
      <CircleCheck />
      <AlertTitle>Tutorial ready</AlertTitle>
      <AlertDescription>
        <p>Every explanation links to the code it came from.</p>
        <div className="mt-2">
          {tutorial ? (
            <LinkButton href={tutorialPath(tutorial)}>Open the tutorial</LinkButton>
          ) : (
            <LinkButton href="/library" variant="outline">
              Open your library
            </LinkButton>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
