import { useCallback, useState } from 'react'
import { useCreateShareLink } from './use-library'

export interface ShareLinkState {
  url: string | null
  create: () => void
  clear: () => void
  isPending: boolean
  isError: boolean
}

export function useShareLink(tutorialId: string): ShareLinkState {
  const { mutate, reset, isPending, isError } = useCreateShareLink()
  const [url, setUrl] = useState<string | null>(null)

  const create = useCallback(
    () => mutate({ tutorialId }, { onSuccess: (link) => setUrl(link.url) }),
    [mutate, tutorialId],
  )

  const clear = useCallback(() => {
    setUrl(null)
    reset()
  }, [reset])

  return { url, create, clear, isPending, isError }
}
