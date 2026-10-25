import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useActiveReference() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const refId = params.get('ref')

  const select = useCallback(
    (next: string | null) => {
      const search = new URLSearchParams(params.toString())
      if (next === null) search.delete('ref')
      else search.set('ref', next)
      const query = search.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  return { refId, select }
}
