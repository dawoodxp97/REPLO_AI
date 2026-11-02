import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import {
  loadOverviewFor,
  latestVersionHref,
  resumeTarget,
  type OverviewQuery,
} from '@/features/tutorials/overview-loader'
import { parseVersion } from '@/lib/tutorial-paths'
import { TutorialOverview } from '@/features/tutorials/tutorial-overview'
import { TutorialShell } from '@/features/tutorials/tutorial-shell'
import { env } from '@/lib/env'
import { tutorialPath, type TutorialRef } from '@/lib/tutorial-paths'

interface RouteProps {
  params: Promise<TutorialRef>
  searchParams: Promise<OverviewQuery>
}

export async function generateMetadata({ params, searchParams }: RouteProps): Promise<Metadata> {
  const ref = await params
  const overview = await loadOverviewFor(ref, await searchParams)
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

export default async function TutorialOverviewRoute({ params, searchParams }: RouteProps) {
  const ref = await params
  const query = await searchParams
  const overview = await loadOverviewFor(ref, query)
  if (!overview) notFound()
  const linkContext = { version: parseVersion(query.version), shareToken: query.share }

  if (query.resume !== undefined) {
    const target = await resumeTarget(ref, overview, linkContext)
    if (target) redirect(target)
  }

  return (
    <TutorialShell>
      <TutorialOverview
        overview={overview}
        shareUrl={`${env.appUrl}${tutorialPath(ref)}`}
        latestVersionHref={latestVersionHref(ref, overview, query.share)}
        shareToken={linkContext.shareToken}
        versionNo={linkContext.version}
      />
    </TutorialShell>
  )
}
