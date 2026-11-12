import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import { useDebouncedValue } from '@/hooks/use-debounced-value'
import { orpc } from '@/lib/orpc'

export const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 250

const noSubscription = () => () => undefined
const clientLabel = () => (/mac|iphone|ipad/i.test(navigator.platform) ? '⌘' : 'Ctrl')
const serverLabel = () => 'Ctrl'

export function useLibrarySearch(query: string) {
  const debounced = useDebouncedValue(query.trim(), DEBOUNCE_MS)
  const results = useQuery(
    orpc.search.own.queryOptions({
      input: { q: debounced, limit: 10 },
      enabled: debounced.length >= MIN_QUERY_LENGTH,
      placeholderData: keepPreviousData,
    }),
  )
  return { debounced, results }
}

export function useSearchShortcut(input: RefObject<HTMLInputElement | null>) {
  const modifierLabel = useSyncExternalStore(noSubscription, clientLabel, serverLabel)

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        input.current?.focus()
        input.current?.select()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [input])

  return modifierLabel
}
