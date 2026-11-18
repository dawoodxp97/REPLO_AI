import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import type { CourseRef } from '@/lib/course-paths'
import { parseVersion } from '@/lib/course-paths'
import { loadOverviewFor, type OverviewQuery } from '@/features/courses/overview-loader'
import { WorkspacePage } from '@/features/workspace/workspace-page'

interface RouteProps {
  params: Promise<CourseRef>
  searchParams: Promise<OverviewQuery>
}

export async function generateMetadata({ params, searchParams }: RouteProps): Promise<Metadata> {
  const ref = await params
  const overview = await loadOverviewFor(ref, await searchParams)
  if (!overview) return { title: 'Workspace not found', robots: { index: false } }
  return { title: `${overview.course.title} — Workspace`, robots: { index: false } }
}

export default async function WorkspaceRoute({ params, searchParams }: RouteProps) {
  const ref = await params
  const query = await searchParams
  const overview = await loadOverviewFor(ref, query)
  if (!overview) notFound()

  return <WorkspacePage course={ref} overview={overview} versionNo={parseVersion(query.version)} />
}
