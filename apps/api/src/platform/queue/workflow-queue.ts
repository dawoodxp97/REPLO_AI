import type { Workflow } from 'cloudflare:workers'
import type { Logger } from 'pino'
import { GenerateCoursePayload } from '../../worker/job-payload'
import type { EnqueueOptions, JobQueue } from './job-queue'

// Cloudflare runtime JobQueue: delivery is a Workflows instance whose id is the job id.
// The send may run inside the caller's database transaction, so the binding call is
// best-effort: the instance's first claim requires a committed job row, and the cron
// sweep re-creates any instance that is missing once the row is durable.
export function workflowQueue(getWorkflow: () => Workflow | undefined, log: Logger): JobQueue {
  return {
    async send(_name: string, data: object, { singletonKey }: EnqueueOptions) {
      const workflow = getWorkflow()
      if (!workflow) return null
      const payload = GenerateCoursePayload.parse(data)
      try {
        await workflow.create({ id: payload.jobId, params: { jobId: payload.jobId } })
        return singletonKey
      } catch (err) {
        // A duplicate instance id is normal on retry/re-sends; anything else still has
        // the cron sweep as the reliable backstop, so both cases are warnings, not failures.
        log.warn({ err, jobId: payload.jobId }, 'workflow create failed; cron sweep will dispatch')
        return null
      }
    },
  }
}
