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
  analytics: authed.dashboard.analytics.handler(({ input, context }) =>
    context.services.analytics.report(context.user.id, input),
  ),
  save: authed.dashboard.save.handler(({ input, context }) =>
    context.services.analytics.save(context.user.id, input),
  ),
  listDashboards: authed.dashboard.listDashboards.handler(({ input, context }) =>
    context.services.analytics.list(context.user.id, input),
  ),
  deleteDashboard: authed.dashboard.deleteDashboard.handler(async ({ input, context }) => {
    await context.services.analytics.remove(context.user.id, input.dashboardId)
    return { ok: true as const }
  }),
}