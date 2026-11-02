import { OK_RESULT } from '@replo/contracts'
import { authed } from '../../orpc'

export const notificationsRouter = {
  list: authed.notifications.list.handler(({ input, context }) =>
    context.services.notifications.list(context.user.id, input),
  ),
  unreadCount: authed.notifications.unreadCount.handler(({ context }) =>
    context.services.notifications.unreadCount(context.user.id),
  ),
  markRead: authed.notifications.markRead.handler(({ input, context }) =>
    context.services.notifications.markRead(context.user.id, input.id),
  ),
  markAllRead: authed.notifications.markAllRead.handler(({ context }) =>
    context.services.notifications.markAllRead(context.user.id),
  ),
  delete: authed.notifications.delete.handler(async ({ input, context }) => {
    await context.services.notifications.delete(context.user.id, input.id)
    return OK_RESULT
  }),
}
