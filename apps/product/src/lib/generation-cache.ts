import type { QueryClient } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function invalidateGenerationQueries(queryClient: QueryClient): Promise<unknown> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: orpc.dashboard.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.repositories.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.tutorials.list.key() }),
    queryClient.invalidateQueries({ queryKey: orpc.notifications.key() }),
  ])
}
