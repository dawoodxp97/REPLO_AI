import type { QueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function invalidateGenerationQueries(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.jobs.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.repositories.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.tutorials.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
  ])
}
