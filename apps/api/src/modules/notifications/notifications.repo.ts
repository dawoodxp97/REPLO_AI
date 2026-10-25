import { and, count, desc, eq, isNull, lt, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/pg-core'
import type { DbOrTx } from '../../platform/db/client'
import { notifications } from '../../platform/db/schema'

export type NotificationRow = typeof notifications.$inferSelect

const cursorRow = alias(notifications, 'cursor_row')

export const notificationsRepo = (db: DbOrTx) => ({
  async findOwned(userId: string, id: string) {
    const [row] = await db
      .select({ id: notifications.id })
      .from(notifications)
      .where(and(eq(notifications.id, id), eq(notifications.userId, userId)))
      .limit(1)
    return row
  },

  page(userId: string, limit: number, cursorId: string | undefined): Promise<NotificationRow[]> {
    const older =
      cursorId === undefined
        ? undefined
        : sql`(${notifications.createdAt}, ${notifications.id}) < ${db
            .select({ createdAt: cursorRow.createdAt, id: cursorRow.id })
            .from(cursorRow)
            .where(and(eq(cursorRow.id, cursorId), eq(cursorRow.userId, userId)))}`

    return db
      .select()
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
