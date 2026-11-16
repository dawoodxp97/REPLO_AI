import type { Audience, CourseSummaryDto } from '@replo/contracts'
import type { CourseWithRepo } from './courses.repo'

export interface CurrentVersion {
  versionNo: number
  audience: Audience
}

export function toCourseSummary(
  row: CourseWithRepo,
  current: CurrentVersion | undefined,
  progress: number | null,
): CourseSummaryDto {
  return {
    id: row.course.id,
    slug: row.course.slug,
    title: row.course.title,
    owner: row.owner,
    repo: row.name,
    audience: current?.audience ?? 'intermediate',
    currentVersionNo: current?.versionNo ?? 0,
    updatedAt: row.course.updatedAt.toISOString(),
    progress,
  }
}
