import type { TutorialOverviewDto } from '@replo/contracts'
import { useQueries } from '@tanstack/react-query'
import { orpc } from '@/lib/orpc'

export function useCitedPaths(
  overview: TutorialOverviewDto,
  shareToken: string | undefined,
): ReadonlySet<string> {
  const chapters = useQueries({
    queries: overview.outline.map((chapter) =>
      orpc.tutorials.getChapter.queryOptions({
        input: { versionId: overview.versionId, chapterKey: chapter.key, shareToken },
      }),
    ),
  })
  return new Set(
    chapters.flatMap((chapter) =>
      Object.values(chapter.data?.sourceRefs ?? {}).map((reference) => reference.path),
    ),
  )
}
