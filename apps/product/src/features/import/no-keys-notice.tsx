import { Alert, AlertDescription, AlertTitle } from '@replo/ui'
import { KeyRound } from 'lucide-react'
import { LinkButton } from '@/components/link-button'
import { RecommendedKeyNote } from '@/features/keys'

export function NoKeysNotice() {
  return (
    <Alert variant="interpretation">
      <KeyRound />
      <AlertTitle>Add an API key first</AlertTitle>
      <AlertDescription>
        <p>A tutorial cannot start without a key to pay for it.</p>
        <RecommendedKeyNote />
        <LinkButton href="/settings/keys" variant="outline" size="sm" className="mt-1">
          Add a key
        </LinkButton>
      </AlertDescription>
    </Alert>
  )
}
