import { useQuery } from '@tanstack/react-query'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { orpc } from '@/lib/orpc'

const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

export function useLibrarySearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS)
  const results = useQuery(
    orpc.search.own.queryOptions({
      input: { q: debounced, limit: 10 },
      enabled: debounced.length >= MIN_QUERY_LENGTH,
    }),
  )
  return { debounced, results }
}
