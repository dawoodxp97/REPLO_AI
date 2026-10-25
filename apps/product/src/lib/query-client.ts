import { QueryClient } from '@tanstack/react-query'
import { shouldRetryQuery } from './api-error'

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        retry: shouldRetryQuery,
      },
    },
  })
}
