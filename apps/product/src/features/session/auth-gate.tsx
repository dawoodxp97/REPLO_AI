'use client'

import { Button, Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { isApiErrorCode } from '@/lib/api-error'
import { orpc } from '@/lib/orpc'

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const me = useQuery(orpc.me.get.queryOptions())
  const signedOut = isApiErrorCode(me.error, 'UNAUTHORIZED')

  useEffect(() => {
    if (signedOut) router.replace('/login')
  }, [router, signedOut])

  if (me.isPending || signedOut) {
    return (
      <div
        aria-busy="true"
        className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:px-8"
      >
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  if (me.isError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <ErrorPanel
          title="We could not reach Replo"
          description="Check your connection, then try again."
          action={
            <Button variant="outline" onClick={() => void me.refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  return children
}
