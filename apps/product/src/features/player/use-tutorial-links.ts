import { useMemo } from 'react'
import {
  createTutorialLinks,
  type TutorialLinkContext,
  type TutorialLinks,
  type TutorialRef,
} from '@/lib/tutorial-paths'

export function useTutorialLinks(
  { owner, repo, slug }: TutorialRef,
  { version, shareToken }: TutorialLinkContext,
): TutorialLinks {
  return useMemo(
    () => createTutorialLinks({ owner, repo, slug }, { version, shareToken }),
    [owner, repo, slug, version, shareToken],
  )
}
