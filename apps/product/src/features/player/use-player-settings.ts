import { useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function usePlayerSettings(): { quizzesEnabled: boolean; autoAdvance: boolean } {
  const settings = useQuery(orpc.settings.get.queryOptions())
  return {
    quizzesEnabled: settings.data?.quizzesEnabled ?? true,
    autoAdvance: settings.data?.autoAdvance ?? false,
  }
}
