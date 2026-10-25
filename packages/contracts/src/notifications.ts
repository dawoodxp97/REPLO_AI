import { oc } from '@orpc/contract'
import { z } from 'zod'
import { IdCursor, OkResult, pageInput } from './common'

export const NotificationKind = z.enum(['job_succeeded', 'job_failed', 'job_canceled'])
export type NotificationKind = z.infer<typeof NotificationKind>

export const NotificationDto = z.object({
  id: z.uuid(),
  kind: NotificationKind,
  title: z.string(),
  body: z.string().nullable(),
  link: z.string().nullable(),
  jobId: z.uuid().nullable(),
  readAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
})
export type NotificationDto = z.infer<typeof NotificationDto>

export const NotificationPage = z.object({
  items: z.array(NotificationDto),
  nextCursor: IdCursor.nullable(),
})
export type NotificationPage = z.infer<typeof NotificationPage>

export const UnreadCount = z.object({ count: z.number().int().nonnegative() })
export type UnreadCount = z.infer<typeof UnreadCount>

const NotificationRef = z.object({ id: z.uuid() })

export const notificationsContract = {
  list: oc
    .route({ method: 'GET', path: '/notifications' })
    .input(pageInput(IdCursor))
    .output(NotificationPage),
  unreadCount: oc.route({ method: 'GET', path: '/notifications/unread-count' }).output(UnreadCount),
  markRead: oc
    .route({ method: 'POST', path: '/notifications/{id}/read' })
    .input(NotificationRef)
    .output(NotificationDto),
  markAllRead: oc
    .route({ method: 'POST', path: '/notifications/read-all' })
    .output(z.object({ updated: z.number().int().nonnegative() })),
  delete: oc
    .route({ method: 'DELETE', path: '/notifications/{id}' })
    .input(NotificationRef)
    .output(OkResult),
}
