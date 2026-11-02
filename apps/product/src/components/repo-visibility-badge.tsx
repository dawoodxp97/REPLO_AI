import { Badge } from '@replo/ui'
import { Lock } from 'lucide-react'

export function RepoVisibilityBadge({ isPrivate }: { isPrivate: boolean }) {
  if (!isPrivate) return null
  return (
    <Badge variant="outline">
      <Lock aria-hidden />
      Private
    </Badge>
  )
}
