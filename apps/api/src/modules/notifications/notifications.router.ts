import { authed } from '../../orpc'

export const notificationsRouter = {
  list: authed.notifications.list.handler(({ input, context }) =>
    context.services.notifications.list(context.user.id, input),
  ),
  unreadCount: authed.notifications.unreadCount.handler(({ context }) =>
    context.services.notifications.unreadCount(context.user.id).then((count) => ({ count })),
  ),
  markRead: authed.notifications.markRead.handler(({ input, context }) =>
    context.services.notifications.markRead(context.user.id, input.id),
  ),
  markAllRead: authed.notifications.markAllRead.handler(({ context }) =>
    context.services.notifications.markAllRead(context.user.id).then((updated) => ({ updated })),
  ),
  delete: authed.notifications.delete.handler(({ input, context }) =>
    context.services.notifications
      .delete(context.user.id, input.id)
      .then(() => ({ ok: true as const })),
  ),
}
