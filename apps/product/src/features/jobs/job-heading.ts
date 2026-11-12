import { STAGES, type GenerationJobDto } from '@replo/contracts'
import { AUDIENCE_LABELS } from '@/features/preferences/audience'
import { capitalize } from '@/lib/format'
import type { JobProgress } from './job-progress-state'
import { STAGE_LABELS } from './job-status'

export const UNNAMED_JOB_TITLE = 'Tutorial generation'

type JobHeadingInput = Pick<GenerationJobDto, 'repository' | 'audience' | 'preset'>

export function jobTitle(job: Pick<GenerationJobDto, 'repository'>): string {
  return job.repository ? `${job.repository.owner}/${job.repository.name}` : UNNAMED_JOB_TITLE
}

export function jobPlan(job: JobHeadingInput): string {
  const reader = `${AUDIENCE_LABELS[job.audience].toLowerCase()} readers`
  if (!job.preset) return `Written for ${reader}.`
  return `${capitalize(job.preset)} preset, written for ${reader}.`
}

export function stageLine(
  progress: Pick<JobProgress, 'stages'>,
  job: Pick<GenerationJobDto, 'status' | 'stage'>,
): string {
  if (job.status === 'succeeded') return `All ${STAGES.length} stages done`
  const live = STAGES.findIndex(
    (stage) => progress.stages[stage] === 'running' || progress.stages[stage] === 'failed',
  )
  const index = live >= 0 ? live : job.stage ? STAGES.indexOf(job.stage) : -1
  const stage = STAGES[index]
  if (!stage) return job.status === 'queued' ? 'Waiting to start' : 'No stage has started'
  return `Stage ${index + 1} of ${STAGES.length}: ${STAGE_LABELS[stage]}`
}
