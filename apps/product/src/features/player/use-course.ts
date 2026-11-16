import { useQuery } from '@tanstack/react-query'
import { useSearchParams } from 'next/navigation'
import { useMemo } from 'react'
import { orpc } from '@/lib/orpc'
import {
  createCourseLinks,
  parseVersion,
  type CourseLinkContext,
  type CourseLinks,
  type CourseRef,
} from '@/lib/course-paths'

export function useCourseOverview({ owner, repo, slug }: CourseRef) {
  const params = useSearchParams()
  const shareToken = params.get('share') ?? undefined
  const versionNo = parseVersion(params.get('version') ?? undefined)
  const linkContext: CourseLinkContext = { version: versionNo, shareToken }
  const overview = useQuery(
    orpc.courses.get.queryOptions({ input: { owner, repo, slug, versionNo } }),
  )
  return { shareToken, versionNo, linkContext, overview }
}

export function useCourseLinks(
  { owner, repo, slug }: CourseRef,
  { version, shareToken }: CourseLinkContext,
): CourseLinks {
  return useMemo(
    () => createCourseLinks({ owner, repo, slug }, { version, shareToken }),
    [owner, repo, slug, version, shareToken],
  )
}
