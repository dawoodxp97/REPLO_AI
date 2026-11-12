import type { ProgressDto } from '@replo/contracts'
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Progress,
} from '@replo/ui'
import { LinkButton } from '@/components/link-button'

export function ProgressSummary({
  progress,
  resumeHref,
}: {
  progress: Pick<ProgressDto, 'completed' | 'total'>
  resumeHref: string | null
}) {
  const percent = completionPercent(progress.completed, progress.total)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="tabular text-base">
          {progress.completed} of {progress.total} lessons complete
        </CardTitle>
        <CardDescription>
          Progress is kept for this version. Regenerating the tutorial keeps it for lessons that did
          not change.
        </CardDescription>
        {resumeHref ? (
          <CardAction>
            <LinkButton href={resumeHref}>Resume reading</LinkButton>
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-2">
        <Progress value={percent} aria-label="Lessons complete" />
        <p className="tabular font-mono text-xs text-muted-foreground">{percent}%</p>
      </CardContent>
    </Card>
  )
}

export function completionPercent(completed: number, total: number): number {
  if (total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((completed / total) * 100)))
}
