import type {
  NotificationDto,
  NotificationKind,
  NotificationPage,
  UnreadCount,
} from '@replo/contracts'
import type { Db, Tx } from '../../platform/db/client'
import { badRequest, requireFound } from '../../platform/errors'
import { isoOrNull } from '../../platform/time'
import { decodeCursor, encodeCursor } from './notifications.cursor'
import { notificationsRepo, type NotificationRow } from './notifications.repo'

export type JobEndStatus = 'succeeded' | 'failed' | 'canceled'

export interface NotificationsService {
  recordJobEnd(
    tx: Tx,
    input: { userId: string; jobId: string; status: JobEndStatus },
  ): Promise<void>
  list(
    userId: string,
    input: { limit: number; cursor?: string | undefined },
  ): Promise<NotificationPage>
  unreadCount(userId: string): Promise<UnreadCount>
  markRead(userId: string, notificationId: string): Promise<NotificationDto>
  markAllRead(userId: string): Promise<{ updated: number }>
  delete(userId: string, notificationId: string): Promise<void>
  purgeCreatedBefore(before: Date): Promise<number>
}

const MESSAGES: Record<JobEndStatus, { kind: NotificationKind; title: string }> = {
  succeeded: { kind: 'job_succeeded', title: 'Tutorial ready' },
  failed: { kind: 'job_failed', title: 'Generation failed' },
  canceled: { kind: 'job_canceled', title: 'Generation canceled' },
}

const toDto = (row: NotificationRow): NotificationDto => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  body: row.body,
  link: row.link,
  jobId: row.jobId,
  readAt: isoOrNull(row.readAt),
  createdAt: row.createdAt.toISOString(),
})

export function createNotificationsService(db: Db): NotificationsService {
  const repo = notificationsRepo(db)

  return {
    async recordJobEnd(tx, { userId, jobId, status }) {
      const { kind, title } = MESSAGES[status]
      await notificationsRepo(tx).insert({
        userId,
        kind,
        title,
        link: `/jobs/${jobId}`,
        jobId,
      })
    },

    async list(userId, { limit, cursor }) {
      const after = cursor === undefined ? undefined : decodeCursor(cursor)
      if (cursor !== undefined && after === undefined) badRequest('Invalid cursor')
      const rows = await repo.page(userId, limit, after)
      const items = rows.slice(0, limit)
      const last = items.at(-1)
      return {
        items: items.map(toDto),
        nextCursor:
          rows.length > limit && last ? encodeCursor({ at: last.cursorAt, id: last.id }) : null,
      }
    },

    async unreadCount(userId) {
      return { count: await repo.unreadCount(userId) }
    },

    async markRead(userId, notificationId) {
      const [row] = await repo.markRead(userId, notificationId)
      return toDto(requireFound(row, 'Notification'))
    },

    async markAllRead(userId) {
      return { updated: (await repo.markAllRead(userId)).length }
    },

    async delete(userId, notificationId) {
      const [removed] = await repo.remove(userId, notificationId)
      requireFound(removed, 'Notification')
    },

    async purgeCreatedBefore(before) {
      return (await repo.purgeCreatedBefore(before)).length
    },
  }
}
