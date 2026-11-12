import type { MeDto } from '@replo/contracts'
import { Avatar, AvatarFallback, AvatarImage } from '@replo/ui'

type AvatarUser = Pick<MeDto['user'], 'name' | 'email' | 'image'>

export function initialsOf(user: Pick<AvatarUser, 'name' | 'email'> | undefined): string {
  const source = user?.name?.trim() || user?.email?.trim() || '?'
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
}

export function UserAvatar({
  user,
  className,
}: {
  user: AvatarUser | undefined
  className?: string
}) {
  return (
    <Avatar className={className}>
      {user?.image ? <AvatarImage src={user.image} alt="" /> : null}
      <AvatarFallback>{initialsOf(user)}</AvatarFallback>
    </Avatar>
  )
}
