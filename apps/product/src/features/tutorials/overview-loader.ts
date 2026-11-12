import type { TutorialOverviewDto } from '@replo/contracts'
import { cache } from 'react'
import { nullOnNotFound } from '@/lib/api-error'
import { serverApi } from '@/lib/server-client'
import { resolveLessonHref } from '@/features/player/lesson/lesson-navigation'
import {
  createTutorialLinks,
  latestVersionNo,
  parseVersion,
  type TutorialLinkContext,
  type TutorialRef,
} from '@/lib/tutorial-paths'

export interface OverviewQuery {
  version?: string
  share?: string
  resume?: string
}

export const loadOverview = cache(
  async (
    owner: string,
    repo: string,
    slug: string,
    version: string | undefined,
    share: string | undefined,
  ): Promise<TutorialOverviewDto | null> => {
    const api = await serverApi()
    return nullOnNotFound(
      api.tutorials.get({ owner, repo, slug, versionNo: parseVersion(version), shareToken: share }),
    )
  },
)

export function loadOverviewFor(ref: TutorialRef, query: OverviewQuery) {
  return loadOverview(ref.owner, ref.repo, ref.slug, query.version, query.share)
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
  ref: TutorialRef,
  overview: TutorialOverviewDto,
  context: TutorialLinkContext,
): Promise<string | null> {
  const api = await serverApi()
  const progress = await api.learning
    .getProgress({ tutorialId: overview.tutorial.id, versionId: overview.versionId })
    .catch(() => null)
  const nextLessonKey = progress?.nextLessonKey
  if (!nextLessonKey) return null
  return resolveLessonHref(overview.outline, createTutorialLinks(ref, context), nextLessonKey)
}

export function latestVersionHref(
  ref: TutorialRef,
  overview: TutorialOverviewDto,
  shareToken: string | undefined,
): string | null {
  const latest = latestVersionNo(overview.versions)
  return latest > 0 ? createTutorialLinks(ref, { version: latest, shareToken }).overview() : null
}
