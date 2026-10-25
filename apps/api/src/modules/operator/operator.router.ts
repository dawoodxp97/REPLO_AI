import { authed } from '../../orpc'

export const operatorRouter = {
  jobs: authed.operator.jobs.handler(({ input, context }) =>
    context.services.operator.jobs(context.user.id, input),
  ),
  job: authed.operator.job.handler(({ input, context }) =>
    context.services.operator.job(context.user.id, input.jobId),
  ),
}
