import type {
  NotificationDto,
  NotificationKind,
  NotificationPage,
  UnreadCount,
} from '@replo/contracts'
import type { Db, Tx } from '../../platform/db/client'
import { badRequest, requireFound } from '../../platform/errors'
import { jobLink, type TerminalStatus } from '../../platform/job-status'
import { keysetPage } from '../../platform/pagination'
import { isoOrNull } from '../../platform/time'
import { decodeCursor, encodeCursor } from './notifications.cursor'
import { notificationsRepo, type NotificationRow } from './notifications.repo'

export interface NotificationsService {
  recordJobEnd(
    tx: Tx,
    input: { userId: string; jobId: string; status: TerminalStatus },
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

const MESSAGES: Record<TerminalStatus, { kind: NotificationKind; title: string }> = {
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
        link: jobLink(jobId),
        jobId,
      })
    },

    async list(userId, { limit, cursor }) {
      const after = cursor === undefined ? undefined : decodeCursor(cursor)
      if (cursor !== undefined && after === undefined) badRequest('Invalid cursor')
      const rows = await repo.page(userId, limit + 1, after)
      return keysetPage(rows, limit, toDto, (row) => encodeCursor({ at: row.cursorAt, id: row.id }))
    },

    async unreadCount(userId) {
      return { count: await repo.unreadCount(userId) }
    },

    async markRead(userId, notificationId) {
      const [row] = await repo.markRead(userId, notificationId)
      return toDto(requireFound(row, 'Notification'))
    },

    async markAllRead(userId) {
      return { updated: await repo.markAllRead(userId) }
    },

    async delete(userId, notificationId) {
      const [removed] = await repo.remove(userId, notificationId)
      requireFound(removed, 'Notification')
    },

    async purgeCreatedBefore(before) {
      return repo.purgeCreatedBefore(before)
    },
  }
}
