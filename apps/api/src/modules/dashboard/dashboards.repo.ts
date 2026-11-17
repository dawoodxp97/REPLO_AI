import { and, desc, eq, ilike, sql } from 'drizzle-orm'
import type { AnalyticsQuery } from '@replo/contracts'
import type { DbOrTx } from '../../platform/db/client'
import { savedDashboards } from '../../platform/db/schema'

export type SavedDashboardRow = typeof savedDashboards.$inferSelect

export const dashboardsRepo = (db: DbOrTx) => ({
  async insert(userId: string, name: string, query: AnalyticsQuery): Promise<SavedDashboardRow> {
    const [row] = await db.insert(savedDashboards).values({ userId, name, query }).returning()
    if (!row) throw new Error('saved dashboard insert returned no row')
    return row
  },

  list(userId: string, limit: number, offset: number) {
    return db
      .select()
      .from(savedDashboards)
      .where(eq(savedDashboards.userId, userId))
      .orderBy(desc(savedDashboards.id))
      .limit(limit)
      .offset(offset)
  },

  async find(userId: string, id: string): Promise<SavedDashboardRow | undefined> {
    const [row] = await db
      .select()
      .from(savedDashboards)
      .where(and(eq(savedDashboards.userId, userId), eq(savedDashboards.id, id)))
      .limit(1)
    return row
  },

  async nameTaken(userId: string, name: string): Promise<boolean> {
    const [row] = await db
      .select({ id: savedDashboards.id })
      .from(savedDashboards)
      .where(and(eq(savedDashboards.userId, userId), eq(savedDashboards.name, name)))
      .limit(1)
    return row !== undefined
  },

  async remove(userId: string, id: string): Promise<boolean> {
    const rows = await db
      .delete(savedDashboards)
      .where(and(eq(savedDashboards.userId, userId), eq(savedDashboards.id, id)))
      .returning({ id: savedDashboards.id })
    return rows.length > 0
  },

  search(userId: string, pattern: string, limit: number) {
    return db
      .select({ dashboardId: savedDashboards.id, name: savedDashboards.name })
      .from(savedDashboards)
      .where(and(eq(savedDashboards.userId, userId), ilike(savedDashboards.name, pattern)))
      .orderBy(desc(savedDashboards.name))
      .limit(limit)
  },

  async count(userId: string): Promise<number> {
    const [row] = await db
      .select({ value: sql<number>`count(*)`.mapWith(Number) })
      .from(savedDashboards)
      .where(eq(savedDashboards.userId, userId))
    return row?.value ?? 0
  },
})