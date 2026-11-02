import { Button, Skeleton } from '@replo/ui'
import type { ReactNode } from 'react'
import { ErrorPanel } from './error-panel'

export interface QueryLike<T> {
  isPending: boolean
  data: T | undefined
  refetch: () => unknown
}

export interface QueryBoundaryProps<T> {
  query: QueryLike<T>
  errorTitle: string
  errorDescription?: ReactNode
  loading?: ReactNode
  children: (data: T) => ReactNode
}

export function QueryBoundary<T>({
  query,
  errorTitle,
  errorDescription = 'Check your connection, then try again.',
  loading,
  children,
}: QueryBoundaryProps<T>) {
  if (query.isPending) {
    return loading ?? <Skeleton aria-busy="true" className="h-40 w-full" />
  }
  if (query.data === undefined) {
    return (
      <ErrorPanel
        title={errorTitle}
        description={errorDescription}
        action={
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            Try again
          </Button>
        }
      />
    )
  }
  return children(query.data)
}
