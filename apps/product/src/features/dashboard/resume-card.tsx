import type { DashboardSummary } from '@replo/contracts'
import { ArrowRight } from 'lucide-react'
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import { LinkButton } from '@/components/link-button'
import { formatRepoName } from '@/lib/format'
import { tutorialPath } from '@/lib/tutorial-paths'

export function ResumeCard({ resume }: { resume: NonNullable<DashboardSummary['resume']> }) {
  return (
    <Card className="border-l-2 border-l-foreground">
      <CardHeader>
        <CardDescription>Continue reading</CardDescription>
        <CardTitle className="text-xl tracking-tight">{resume.lessonTitle}</CardTitle>
        <CardDescription className="font-mono text-xs">
          {formatRepoName(resume.owner, resume.repo)}
        </CardDescription>
        <CardAction>
          <LinkButton href={`${tutorialPath(resume)}?resume`} variant="outline">
            Resume
            <ArrowRight aria-hidden="true" />
          </LinkButton>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
