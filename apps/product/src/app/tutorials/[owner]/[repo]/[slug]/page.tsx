import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { TutorialOverview } from '@/features/tutorials/tutorial-overview'
import { isApiErrorCode } from '@/lib/api-error'
import { env } from '@/lib/env'
import { serverApi } from '@/lib/server-client'
import { lessonPath, tutorialPath, type TutorialRef } from '@/lib/tutorial-paths'
import type { TutorialOverviewDto } from '@replo/contracts'

type Params = { owner: string; repo: string; slug: string }
type Query = { version?: string; share?: string; resume?: string }

type Api = Awaited<ReturnType<typeof serverApi>>

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Query>
}): Promise<Metadata> {
  const ref = await params
  const query = await searchParams
  const overview = await loadOverview(await serverApi(), ref, query)
  if (!overview) return { title: 'Tutorial not found', robots: { index: false } }

  const isPublic = overview.tutorial.visibility === 'public'
  const description = overview.objectives[0] ?? `A chaptered tutorial for ${ref.owner}/${ref.repo}.`
  return {
    title: overview.tutorial.title,
    description,
    robots: isPublic ? undefined : { index: false, follow: false },
    openGraph: isPublic
      ? {
          title: overview.tutorial.title,
          description,
          images: [`${tutorialPath(ref)}/opengraph-image`],
        }
      : undefined,
  }
}

export default async function TutorialOverviewRoute({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams: Promise<Query>
}) {
  const ref = await params
  const query = await searchParams
  const api = await serverApi()
  const overview = await loadOverview(api, ref, query)
  if (!overview) notFound()

  if (query.resume !== undefined) {
    const target = await resumeTarget(api, ref, overview)
    if (target) redirect(target)
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <TutorialOverview
        overview={overview}
        shareUrl={`${env.appUrl}${tutorialPath(ref)}`}
        latestVersionHref={latestVersionHref(ref, overview)}
        shareToken={query.share}
      />
    </main>
  )
}

async function loadOverview(
  api: Api,
  ref: TutorialRef,
  query: Query,
): Promise<TutorialOverviewDto | null> {
  try {
    return await api.tutorials.get({
      ...ref,
      versionNo: parseVersion(query.version),
      shareToken: query.share,
    })
  } catch (error) {
    if (isApiErrorCode(error, 'NOT_FOUND')) return null
    throw error
  }
}

async function resumeTarget(
  api: Api,
  ref: TutorialRef,
  overview: TutorialOverviewDto,
): Promise<string | null> {
  const progress = await api.learning
    .getProgress({ tutorialId: overview.tutorial.id, versionId: overview.versionId })
    .catch(() => null)
  const nextLessonKey = progress?.nextLessonKey
  if (!nextLessonKey) return null
  const chapter = overview.outline.find((item) =>
    item.lessons.some((lesson) => lesson.key === nextLessonKey),
  )
  return chapter ? lessonPath(ref, chapter.key, nextLessonKey) : null
}

function latestVersionHref(ref: TutorialRef, overview: TutorialOverviewDto): string | null {
  const latest = Math.max(0, ...overview.versions.map((version) => version.versionNo))
  return latest > 0 ? `${tutorialPath(ref)}?version=${latest}` : null
}

function parseVersion(value: string | undefined): number | undefined {
  const version = Number(value)
  return Number.isInteger(version) && version > 0 ? version : undefined
}
