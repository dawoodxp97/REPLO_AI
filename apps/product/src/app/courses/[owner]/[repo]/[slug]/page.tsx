import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  loadOverviewFor,
  latestVersionHref,
  resumeTarget,
  type OverviewQuery,
} from '@/features/courses/overview-loader'
import { parseVersion } from '@/lib/course-paths'
import { CourseOverview } from '@/features/courses/course-overview'
import { CourseShell } from '@/features/courses/course-shell'
import type { CourseRef } from '@/lib/course-paths'

interface RouteProps {
  params: Promise<CourseRef>
  searchParams: Promise<OverviewQuery>
}

export async function generateMetadata({ params, searchParams }: RouteProps): Promise<Metadata> {
  const ref = await params
  const overview = await loadOverviewFor(ref, await searchParams)
  if (!overview) return { title: 'Course not found', robots: { index: false } }

  return {
    title: overview.course.title,
    description: overview.objectives[0] ?? `A chaptered course for ${ref.owner}/${ref.repo}.`,
    robots: { index: false, follow: false },
  }
}

export default async function CourseOverviewRoute({ params, searchParams }: RouteProps) {
  const ref = await params
  const query = await searchParams
  const overview = await loadOverviewFor(ref, query)
  if (!overview) notFound()
  const linkContext = { version: parseVersion(query.version) }

  if (query.resume !== undefined) {
    const target = await resumeTarget(ref, overview, linkContext)
    if (target) redirect(target)
  }

  return (
    <CourseShell>
      <CourseOverview
        overview={overview}
        latestVersionHref={latestVersionHref(ref, overview)}
        versionNo={linkContext.version}
      />
    </CourseShell>
  )
}
