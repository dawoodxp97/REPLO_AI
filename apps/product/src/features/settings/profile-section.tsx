'use client'

import { Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { QueryBoundary } from '@/components/query-boundary'
import { orpc } from '@/lib/orpc'
import { DeleteAccountCard } from './delete-account-card'
import { IdentityCard } from './identity-card'
import { SessionsCard } from './sessions-card'
import { SignInMethodsCard } from './sign-in-methods-card'

export function ProfileSection() {
  const me = useQuery(orpc.me.get.queryOptions())

  return (
    <QueryBoundary
      query={me}
      errorTitle="Your profile could not be loaded"
      loading={<Skeleton aria-busy="true" className="h-48 w-full" />}
    >
      {({ user, signInMethods }) => (
        <div className="space-y-8">
          <IdentityCard user={user} />
          <SignInMethodsCard methods={signInMethods} />
          <SessionsCard />
          <DeleteAccountCard />
        </div>
      )}
    </QueryBoundary>
  )
}
