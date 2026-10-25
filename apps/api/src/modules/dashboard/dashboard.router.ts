import { authed } from '../../orpc'

export const dashboardRouter = {
  summary: authed.dashboard.summary.handler(({ context }) =>
    context.services.dashboard.summary(context.user.id),
  ),
  recent: authed.dashboard.recent.handler(({ input, context }) =>
    context.services.dashboard.recent(context.user.id, {
      zone: input.tz,
      limit: input.limit,
      cursor: input.cursor,
    }),
  ),
}
