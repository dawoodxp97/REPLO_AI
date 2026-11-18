// "replo-pipeline" Worker: the Cloudflare replacement of main.worker.ts.
// No fetch is served; entrypoints are the CourseGenerationWorkflow class and the
// scheduled handler (dispatch backstop + stalled sweep + nightly retention).
import { WorkflowEntrypoint, type WorkflowEvent, type WorkflowStep } from 'cloudflare:workers'
import { RunLimits } from '@replo/ai'
import { handleGenerateCourse } from './worker/generate-course'
import { GenerateCoursePayload, MAX_ATTEMPTS } from './worker/job-payload'
import { cloudflareRuntime, captureWorkerEnv, type WorkerEnv } from './platform/cloudflare-runtime'

const STEP_RETRIES = {
  // Same ceiling as the pg-boss queue had (MAX_ATTEMPTS). A retry re-enters
  // handleGenerateCourse, whose stage checkpoints skip completed work.
  limit: MAX_ATTEMPTS - 1,
  delay: '30 seconds',
  backoff: 'exponential',
} as const

export class CourseGenerationWorkflow extends WorkflowEntrypoint<WorkerEnv, { jobId: string }> {
  async run(event: WorkflowEvent<{ jobId: string }>, step: WorkflowStep) {
    captureWorkerEnv(this.env)
    const payload = GenerateCoursePayload.parse(event.payload)

    await step.do('generate-course', { retries: STEP_RETRIES }, async () => {
      const runtime = await cloudflareRuntime(this.env)
      await handleGenerateCourse(
        { jobId: payload.jobId },
        {
          jobs: runtime.domain.jobRuntime.jobStore,
          log: runtime.log,
          stageHandlers: runtime.domain.pipeline.stageHandlers,
          limitsFor: () => new RunLimits({ maxTokens: runtime.config.MAX_JOB_TOKENS }),
        },
      )
    })
  }
}

export default {
  async scheduled(controller, env): Promise<void> {
    captureWorkerEnv(env)
    const runtime = await cloudflareRuntime(env)

    // Dispatch backstop: every dispatchable job row must own a Workflow instance.
    // Covers races between the enqueue transaction and the binding create, and any
    // create that failed at send time.
    for (const jobId of await runtime.queuedJobIds()) await runtime.createWorkflowInstance(jobId)

    await runtime.domain.jobRuntime.requeueStalled()

    if (controller.cron === RETENTION_CRON) {
      const report = await runtime.domain.retention.run(new Date())
      runtime.log.info({ ...report }, 'retention purge finished')
    }
  },
} satisfies ExportedHandler<WorkerEnv>

export const RETENTION_CRON = '0 3 * * *'
export const SWEEP_CRON = '* * * * *'
