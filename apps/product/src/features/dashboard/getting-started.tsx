import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { RecommendedKeyNote } from '@/features/keys/recommended-key-note'

export function GettingStarted() {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyTitle>No tutorials yet</EmptyTitle>
        <EmptyDescription>Import a GitHub repository to start one.</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <RecommendedKeyNote />
        <LinkButton href="/settings/keys" variant="outline">
          Manage keys
        </LinkButton>
      </EmptyContent>
    </Empty>
  )
}
