import { STAGES, type GenerationJobDto, type CourseRef } from '@replo/contracts'
import { Alert, AlertDescription, AlertTitle } from '@replo/ui'
import { Ban, CircleAlert, CircleCheck } from 'lucide-react'
import { LinkButton } from '@/components/link-button'
import { coursePath } from '@/lib/course-paths'
import { describeJobFailure } from './job-errors'
import type { JobProgress } from './job-progress-state'
import { STAGE_LABELS } from './job-status'

export function JobOutcome({ job, progress }: { job: GenerationJobDto; progress: JobProgress }) {
  if (job.status === 'succeeded') return <CourseReady course={job.course} />

  if (job.status === 'failed') {
    const failedStage = STAGES.find((stage) => progress.stages[stage] === 'failed')
    return (
      <Alert variant="destructive" role="alert">
        <CircleAlert />
        <AlertTitle>Generation failed</AlertTitle>
        <AlertDescription>
          <p>{describeJobFailure(job.error?.code ?? null)}</p>
          {failedStage ? <p>Failed during: {STAGE_LABELS[failedStage]}.</p> : null}
          {job.error ? <p className="font-mono text-xs">Error code: {job.error.code}</p> : null}
        </AlertDescription>
      </Alert>
    )
  }

  if (job.status === 'canceled' || progress.terminal === 'canceled') {
    return (
      <Alert>
        <Ban />
        <AlertTitle>Generation canceled</AlertTitle>
        <AlertDescription>
          <p>No further spend happens on your key. Retry to continue from the last checkpoint.</p>
        </AlertDescription>
      </Alert>
    )
  }

  return null
}

function CourseReady({ course }: { course: CourseRef | null }) {
  return (
    <Alert variant="observed">
      <CircleCheck />
      <AlertTitle>Course ready</AlertTitle>
      <AlertDescription>
        <p>Every explanation links to the code it came from.</p>
        <div className="mt-2">
          {course ? (
            <LinkButton href={coursePath(course)}>Open the course</LinkButton>
          ) : (
            <LinkButton href="/library" variant="outline">
              Open your library
            </LinkButton>
          )}
        </div>
      </AlertDescription>
    </Alert>
  )
}
