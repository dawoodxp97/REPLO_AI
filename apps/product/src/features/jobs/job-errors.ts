import { createErrorDescriber } from '@/lib/error-copy'

export const FALLBACK_JOB_FAILURE = 'The job stopped before the tutorial was published.'

const JOB_FAILURE_COPY: Readonly<Record<string, string>> = {
  REPO_NOT_ACCESSIBLE:
    'Replo could not read the repository. It may be private, renamed or deleted.',
  REPO_TOO_LARGE: 'The repository is larger than Replo can process.',
  UNSAFE_ARCHIVE: 'The repository archive contains paths that Replo refuses to extract.',
  PROVIDER_UNAVAILABLE: 'The model provider was unavailable. Retrying usually works.',
  MODEL_UNAVAILABLE: 'A selected model is not available on your key.',
  LLM_OUTPUT_INVALID: 'A model returned output that failed validation.',
  KEY_REMOVED: 'The key used for this job was deleted. Save a key, then retry.',
  KEY_REJECTED: 'The provider rejected your key. Check it in Settings, then retry.',
  BUDGET_EXCEEDED: 'The job reached its spend budget before it finished.',
  TIMEOUT: 'A stage timed out. Retrying usually works.',
  NETWORK: 'A network error interrupted the job. Retrying usually works.',
  HEARTBEAT_LOST: 'The worker stopped responding. Retrying usually works.',
  STAGE_FAILED: 'A stage failed and could not be completed.',
}

export function describeJobFailure(code: string | null): string {
  return (code ? JOB_FAILURE_COPY[code] : undefined) ?? FALLBACK_JOB_FAILURE
}

export const describeJobActionError = createErrorDescriber({
  CONFLICT: 'This job changed state, so that action no longer applies. Reload the page.',
})
