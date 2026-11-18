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
  const versionNo = parseVersion(params.get('version') ?? undefined)
  const linkContext: CourseLinkContext = { version: versionNo }
  const overview = useQuery(
    orpc.courses.get.queryOptions({ input: { owner, repo, slug, versionNo } }),
  )
  return { versionNo, linkContext, overview }
}

export function useCourseLinks(
  { owner, repo, slug }: CourseRef,
  { version }: CourseLinkContext,
): CourseLinks {
  return useMemo(
    () => createCourseLinks({ owner, repo, slug }, { version }),
    [owner, repo, slug, version],
  )
}
