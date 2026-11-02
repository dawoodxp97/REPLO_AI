'use client'

import { Skeleton } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import { QueryBoundary } from '@/components/query-boundary'
import { orpc } from '@/lib/orpc'
import { ModelsForm } from './models-form'

export function ModelsSection() {
  const catalog = useQuery(orpc.models.catalog.queryOptions())
  const preferences = useQuery(orpc.models.getPreferences.queryOptions())

  return (
    <QueryBoundary
      query={catalog}
      errorTitle="Your models could not be loaded"
      loading={<Skeleton aria-busy="true" className="h-64 w-full" />}
    >
      {(catalogData) => (
        <QueryBoundary
          query={preferences}
          errorTitle="Your model preferences could not be loaded"
          loading={<Skeleton aria-busy="true" className="h-64 w-full" />}
        >
          {(preferencesData) => <ModelsForm catalog={catalogData} initial={preferencesData} />}
        </QueryBoundary>
      )}
    </QueryBoundary>
  )
}
