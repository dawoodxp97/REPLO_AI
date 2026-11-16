import { oc } from '@orpc/contract'
import { z } from 'zod'
import { CourseRef } from './common'

export const SearchResults = z.object({
  repositories: z.array(z.object({ repositoryId: z.uuid(), owner: z.string(), name: z.string() })),
  courses: z.array(CourseRef.extend({ courseId: z.uuid(), title: z.string() })),
  lessons: z.array(
    CourseRef.extend({
      courseId: z.uuid(),
      courseTitle: z.string(),
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
