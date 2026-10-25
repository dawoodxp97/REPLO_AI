import { authed } from '../../orpc'

export const jobsRouter = {
  get: authed.jobs.get.handler(async ({ input, context }) => {
    const job = await context.services.jobs.getOwnedJob(context.user.id, input.jobId)
    return context.services.jobs.toDto(job)
  }),
  cancel: authed.jobs.cancel.handler(({ input, context }) =>
    context.services.jobs.cancel(context.user.id, input.jobId),
  ),
  retry: authed.jobs.retry.handler(({ input, context }) =>
    context.services.jobs.retry(context.user.id, input.jobId),
  ),
}
