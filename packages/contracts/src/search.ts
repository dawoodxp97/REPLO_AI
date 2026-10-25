import { oc } from '@orpc/contract'
import { z } from 'zod'

export const SearchResults = z.object({
  repositories: z.array(z.object({ repositoryId: z.uuid(), owner: z.string(), name: z.string() })),
  tutorials: z.array(
    z.object({
      tutorialId: z.uuid(),
      title: z.string(),
      owner: z.string(),
      repo: z.string(),
      slug: z.string(),
    }),
  ),
  lessons: z.array(
    z.object({
      tutorialId: z.uuid(),
      versionId: z.uuid(),
      chapterKey: z.string(),
      lessonKey: z.string(),
      title: z.string(),
    }),
  ),
})
export type SearchResults = z.infer<typeof SearchResults>

export const searchContract = {
  own: oc
    .route({ method: 'GET', path: '/search' })
    .input(
      z.object({
        q: z.string().trim().min(2).max(100),
        limit: z.number().int().min(1).max(25).default(10),
      }),
    )
    .output(SearchResults),
}
