'use client'

import { Button, Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect, type ReactNode } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { isApiErrorCode } from '@/lib/api-error'
import { orpc } from '@/lib/orpc'

function ShellSkeleton() {
  return (
    <div aria-busy="true" className="flex min-h-dvh">
      <aside className="hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r border-sidebar-border bg-sidebar p-3 md:flex">
        <Skeleton className="h-8 w-24" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
        <Skeleton className="mt-auto h-10 w-full" />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center border-b px-4 sm:px-6">
          <Skeleton className="ml-auto h-8 w-40" />
        </header>
        <div className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 lg:px-10">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </div>
  )
}

export function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter()
  const me = useQuery(orpc.me.get.queryOptions())
  const signedOut = isApiErrorCode(me.error, 'UNAUTHORIZED')

  useEffect(() => {
    if (signedOut) router.replace('/login')
  }, [router, signedOut])

  if (me.isPending || signedOut) return <ShellSkeleton />

  if (me.isError) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-16">
        <ErrorPanel
          title="Replo could not be reached"
          description="Check your connection, then try again."
          action={
            <Button variant="outline" size="sm" onClick={() => void me.refetch()}>
              Try again
            </Button>
          }
        />
      </div>
    )
  }

  return children
}
