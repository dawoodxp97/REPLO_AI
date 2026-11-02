import type { TutorialOverviewDto } from '@replo/contracts'
import { Card, CardContent, Separator } from '@replo/ui'
import { CopyLinkButton } from '@/components/copy-link-button'
import { DescriptionItem } from '@/components/description-item'
import { ReportForm } from './report-form'

export interface SharingCardProps {
  overview: TutorialOverviewDto
  shareUrl: string
  shareToken?: string | undefined
}

export function SharingCard({ overview, shareUrl, shareToken }: SharingCardProps) {
  const isPublic = overview.tutorial.visibility === 'public'

  return (
    <Card>
      <CardContent className="space-y-4">
        <dl className="space-y-4">
          <DescriptionItem label="Licence">
            {overview.license ?? 'None found in the repository'}
          </DescriptionItem>
          {isPublic ? (
            <DescriptionItem label="Public link">
              <div className="flex flex-wrap items-center gap-2">
                <code className="min-w-0 font-mono text-xs break-all">{shareUrl}</code>
                <CopyLinkButton url={shareUrl} />
              </div>
            </DescriptionItem>
          ) : null}
        </dl>
        {isPublic ? (
          <>
            <Separator />
            <ReportForm tutorialId={overview.tutorial.id} shareToken={shareToken} />
          </>
        ) : null}
      </CardContent>
    </Card>
  )
}
