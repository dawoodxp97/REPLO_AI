import type { DashboardSummary } from '@replo/contracts'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { formatRepoName } from '@/lib/format'
import { tutorialPath } from '@/lib/tutorial-paths'

export function ResumeCard({ resume }: { resume: NonNullable<DashboardSummary['resume']> }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>Continue reading</CardDescription>
        <CardTitle className="text-base">{resume.lessonTitle}</CardTitle>
        <CardDescription className="font-mono text-xs">
          {formatRepoName(resume.owner, resume.repo)}
        </CardDescription>
        <CardAction>
          <LinkButton href={`${tutorialPath(resume)}?resume`} variant="outline">
            Resume
          </LinkButton>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
