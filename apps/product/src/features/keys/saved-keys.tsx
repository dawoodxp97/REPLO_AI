'use client'

import { Empty, EmptyDescription, EmptyHeader, EmptyTitle, ItemGroup, Skeleton } from '@replo/ui'
import { QueryBoundary } from '@/components/query-boundary'
import { KeyRow } from './key-row'
import { useKeys } from './use-keys'

export function SavedKeys() {
  const keys = useKeys()

  return (
    <QueryBoundary
      query={keys}
      errorTitle="We could not load your keys"
      errorDescription="Check your connection, then try again."
      loading={<Skeleton aria-busy="true" className="h-16 w-full" />}
    >
      {(saved) =>
        saved.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No keys saved</EmptyTitle>
              <EmptyDescription>Add a key below to start generating tutorials.</EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <ItemGroup>
            {saved.map((key) => (
              <KeyRow key={key.id} keyDto={key} />
            ))}
          </ItemGroup>
        )
      }
    </QueryBoundary>
  )
}
