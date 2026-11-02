import { and, count, desc, eq, getTableColumns, isNull, lt, sql } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { notifications } from '../../platform/db/schema'
import type { CursorPosition } from './notifications.cursor'

export type NotificationRow = typeof notifications.$inferSelect
export type NotificationPageRow = NotificationRow & { cursorAt: string }

const cursorAt = sql<string>`to_char(${notifications.createdAt} at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`

export const notificationsRepo = (db: DbOrTx) => ({
  page(
    userId: string,
    limit: number,
    after: CursorPosition | undefined,
  ): Promise<NotificationPageRow[]> {
    const older =
      after === undefined
        ? undefined
        : sql`(${notifications.createdAt}, ${notifications.id}) < (${after.at}::timestamptz, ${after.id}::uuid)`

    return db
      .select({ ...getTableColumns(notifications), cursorAt })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), older))
      .orderBy(desc(notifications.createdAt), desc(notifications.id))
      .limit(limit + 1)
  },

  async unreadCount(userId: string) {
    const [row] = await db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
    return row?.value ?? 0
  },

  markRead(userId: string, id: string): Promise<NotificationRow[]> {
    return db
      .update(notifications)
      .set({ readAt: sql`coalesce(${notifications.readAt}, now())` })
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning()
  },

  markAllRead(userId: string) {
    return db
      .update(notifications)
      .set({ readAt: sql`now()` })
      .where(and(eq(notifications.userId, userId), isNull(notifications.readAt)))
      .returning({ id: notifications.id })
  },

  remove(userId: string, id: string) {
    return db
      .delete(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .returning({ id: notifications.id })
  },

  async insert(row: typeof notifications.$inferInsert) {
    await db.insert(notifications).values(row)
  },

  purgeCreatedBefore(before: Date) {
    return db
      .delete(notifications)
      .where(lt(notifications.createdAt, before))
      .returning({ id: notifications.id })
  },
})
