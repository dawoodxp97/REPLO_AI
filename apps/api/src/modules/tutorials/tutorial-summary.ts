import type { Audience, TutorialSummaryDto } from '@replo/contracts'
import type { TutorialWithRepo } from './tutorials.repo'

export interface CurrentVersion {
  versionNo: number
  audience: Audience
}

export function toTutorialSummary(
  row: TutorialWithRepo,
  current: CurrentVersion | undefined,
  progress: number | null,
): TutorialSummaryDto {
  return {
    id: row.tutorial.id,
    slug: row.tutorial.slug,
    title: row.tutorial.title,
    owner: row.owner,
    repo: row.name,
    visibility: row.tutorial.visibility,
    audience: current?.audience ?? 'intermediate',
    currentVersionNo: current?.versionNo ?? 0,
    updatedAt: row.tutorial.updatedAt.toISOString(),
    progress,
  }
}
