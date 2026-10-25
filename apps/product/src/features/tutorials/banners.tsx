import type { TutorialOverviewDto } from '@replo/contracts'
import { Alert } from '@replo/ui'
import Link from 'next/link'

export interface TutorialBannersProps {
  overview: Pick<TutorialOverviewDto, 'draft' | 'stale' | 'newerVersionAvailable' | 'validation'>
  latestVersionHref: string | null
}

export function TutorialBanners({ overview, latestVersionHref }: TutorialBannersProps) {
  const banners = []

  if (overview.draft) {
    banners.push(
      <Alert key="draft" tone="interpretation" role="status">
        <p className="font-medium">Draft — lower confidence</p>
        <p>
          Some claims could not be fully verified against the code. Confidence:{' '}
          {Math.round(overview.validation.confidence * 100)}%.
        </p>
      </Alert>,
    )
  }

  if (overview.stale) {
    banners.push(
      <Alert key="stale" role="status">
        <p>
          The repository changed after this tutorial was written. Some references may have moved.{' '}
          <Link href="/import" className="text-primary underline underline-offset-4">
            Generate a new tutorial
          </Link>
        </p>
      </Alert>,
    )
  }

  if (overview.newerVersionAvailable && latestVersionHref) {
    banners.push(
      <Alert key="newer" role="status">
        <p>
          A newer version of this tutorial is available.{' '}
          <Link href={latestVersionHref} className="text-primary underline underline-offset-4">
            Read the latest version
          </Link>
        </p>
      </Alert>,
    )
  }

  return banners.length > 0 ? <div className="space-y-3">{banners}</div> : null
}
