import { skipToken, useQuery } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function chapterQueryOptions(
  versionId: string | undefined,
  chapterKey: string,
  shareToken: string | undefined,
) {
  return orpc.tutorials.getChapter.queryOptions({
    input: versionId === undefined ? skipToken : { versionId, chapterKey, shareToken },
  })
}

export function useChapter(
  versionId: string | undefined,
  chapterKey: string,
  shareToken: string | undefined,
) {
  return useQuery(chapterQueryOptions(versionId, chapterKey, shareToken))
}
