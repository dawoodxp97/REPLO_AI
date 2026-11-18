import type { CourseOverviewDto } from '@replo/contracts'
import { cache } from 'react'
import { nullOnNotFound } from '@/lib/api-error'
import { serverApi } from '@/lib/server-client'
import { resolveLessonHref } from '@/features/player/lesson/lesson-navigation'
import {
  createCourseLinks,
  latestVersionNo,
  parseVersion,
  type CourseLinkContext,
  type CourseRef,
} from '@/lib/course-paths'

export interface OverviewQuery {
  version?: string
  resume?: string
}

export const loadOverview = cache(
  async (
    owner: string,
    repo: string,
    slug: string,
    version: string | undefined,
  ): Promise<CourseOverviewDto | null> => {
    const api = await serverApi()
    return nullOnNotFound(api.courses.get({ owner, repo, slug, versionNo: parseVersion(version) }))
  },
)

export function loadOverviewFor(ref: CourseRef, query: OverviewQuery) {
  return loadOverview(ref.owner, ref.repo, ref.slug, query.version)
}

export const loadViewerSignedIn = cache(async (): Promise<boolean> => {
  try {
    const api = await serverApi()
    await api.me.get()
    return true
  } catch {
    return false
  }
})

export async function resumeTarget(
  ref: CourseRef,
  overview: CourseOverviewDto,
  context: CourseLinkContext,
): Promise<string | null> {
  const api = await serverApi()
  const progress = await api.learning
    .getProgress({ courseId: overview.course.id, versionId: overview.versionId })
    .catch(() => null)
  const nextLessonKey = progress?.nextLessonKey
  if (!nextLessonKey) return null
  return resolveLessonHref(overview.outline, createCourseLinks(ref, context), nextLessonKey)
}

export function latestVersionHref(ref: CourseRef, overview: CourseOverviewDto): string | null {
  const latest = latestVersionNo(overview.versions)
  return latest > 0 ? createCourseLinks(ref, { version: latest }).overview() : null
}
