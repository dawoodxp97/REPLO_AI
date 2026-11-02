import type { MeDto } from '@replo/contracts'
import { Avatar, AvatarFallback, AvatarImage, Card, CardContent } from '@replo/ui'
import { User } from 'lucide-react'

export function IdentityCard({ user }: { user: MeDto['user'] }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <Avatar className="size-12">
          {user.image ? <AvatarImage src={user.image} alt="" /> : null}
          <AvatarFallback>
            <User className="size-5" aria-hidden />
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-semibold">
            {user.name ?? user.email ?? 'Your account'}
          </p>
          <p className="truncate text-compact text-muted-foreground">
            {user.email ?? 'No email on this account.'}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
