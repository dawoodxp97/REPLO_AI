import type { TutorialOverviewDto } from '@replo/contracts'
import { Alert, AlertDescription, AlertTitle } from '@replo/ui'
import { History, Info, TriangleAlert } from 'lucide-react'
import { TextLink } from '@/components/text-link'
import { formatPercent } from '@/lib/format'

export interface TutorialBannersProps {
  overview: Pick<TutorialOverviewDto, 'draft' | 'stale' | 'newerVersionAvailable' | 'validation'>
  latestVersionHref: string | null
}

export function TutorialBanners({ overview, latestVersionHref }: TutorialBannersProps) {
  const showNewer = overview.newerVersionAvailable && latestVersionHref !== null
  if (!overview.draft && !overview.stale && !showNewer) return null

  return (
    <div className="space-y-3">
      {overview.draft ? (
        <Alert variant="interpretation" role="status">
          <TriangleAlert />
          <AlertTitle>Draft with lower confidence</AlertTitle>
          <AlertDescription>
            <p>
              Some claims could not be fully verified against the code. Confidence is{' '}
              <span className="tabular font-mono">
                {formatPercent(overview.validation.confidence)}
              </span>
              .
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {overview.stale ? (
        <Alert role="status">
          <Info />
          <AlertTitle>The repository has changed</AlertTitle>
          <AlertDescription>
            <p>
              Some references in this tutorial may have moved since it was written.{' '}
              <TextLink href="/import">Generate a new tutorial</TextLink>
            </p>
          </AlertDescription>
        </Alert>
      ) : null}

      {showNewer ? (
        <Alert role="status">
          <History />
          <AlertTitle>A newer version is available</AlertTitle>
          <AlertDescription>
            <p>
              <TextLink href={latestVersionHref}>Read the latest version</TextLink>
            </p>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
