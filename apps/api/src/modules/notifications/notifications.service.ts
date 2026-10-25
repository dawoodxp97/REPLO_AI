import type { NotificationDto, NotificationKind, NotificationPage } from '@replo/contracts'
import type { Db, Tx } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
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
  unreadCount(userId: string): Promise<number>
  markRead(userId: string, notificationId: string): Promise<NotificationDto>
  markAllRead(userId: string): Promise<number>
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
  readAt: row.readAt?.toISOString() ?? null,
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
      if (cursor !== undefined && !(await repo.findOwned(userId, cursor))) notFound('Notification')
      const rows = await repo.page(userId, limit, cursor)
      const items = rows.slice(0, limit)
      return {
        items: items.map(toDto),
        nextCursor: rows.length > limit ? (items.at(-1)?.id ?? null) : null,
      }
    },

    unreadCount(userId) {
      return repo.unreadCount(userId)
    },

    async markRead(userId, notificationId) {
      const [row] = await repo.markRead(userId, notificationId)
      if (!row) notFound('Notification')
      return toDto(row)
    },

    async markAllRead(userId) {
      return (await repo.markAllRead(userId)).length
    },

    async delete(userId, notificationId) {
      const [removed] = await repo.remove(userId, notificationId)
      if (!removed) notFound('Notification')
    },

    async purgeCreatedBefore(before) {
      return (await repo.purgeCreatedBefore(before)).length
    },
  }
}
