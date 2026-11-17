import { authed } from '../../orpc'

export const adminRouter = {
  overview: authed.admin.overview.handler(({ context }) =>
    context.services.admin.overview(context.user.id),
  ),
  users: authed.admin.users.handler(({ input, context }) =>
    context.services.admin.users(context.user.id, input),
  ),
  jobs: authed.admin.jobs.handler(({ input, context }) =>
    context.services.admin.jobs(context.user.id, input),
  ),
  job: authed.admin.job.handler(({ input, context }) =>
    context.services.admin.job(context.user.id, input.jobId),
  ),
  queues: authed.admin.queues.handler(({ context }) =>
    context.services.admin.queues(context.user.id),
  ),
  system: authed.admin.system.handler(({ context }) =>
    context.services.admin.system(context.user.id),
  ),
}