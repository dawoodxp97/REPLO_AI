import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { orpc } from '@/lib/orpc'
import {
  createTutorialLinks,
  parseVersion,
  type TutorialLinkContext,
  type TutorialLinks,
  type TutorialRef,
} from '@/lib/tutorial-paths'

export function useTutorialOverview({ owner, repo, slug }: TutorialRef) {
  const params = useSearchParams()
  const shareToken = params.get('share') ?? undefined
  const versionNo = parseVersion(params.get('version') ?? undefined)
  const linkContext: TutorialLinkContext = { version: versionNo, shareToken }
  const overview = useQuery(
    orpc.tutorials.get.queryOptions({ input: { owner, repo, slug, versionNo, shareToken } }),
  )
  return { shareToken, versionNo, linkContext, overview }
}

export function useTutorialLinks(
  { owner, repo, slug }: TutorialRef,
  { version, shareToken }: TutorialLinkContext,
): TutorialLinks {
  return useMemo(
    () => createTutorialLinks({ owner, repo, slug }, { version, shareToken }),
    [owner, repo, slug, version, shareToken],
  )
}
