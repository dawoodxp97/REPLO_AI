import type { Preferences } from '@replo/contracts'
import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { userPreferences } from '../../platform/db/schema'

export const settingsRepo = (db: DbOrTx) => ({
  async find(userId: string): Promise<Preferences | undefined> {
    const [row] = await db
      .select({
        theme: userPreferences.theme,
        defaultAudience: userPreferences.defaultAudience,
        autoAdvance: userPreferences.autoAdvance,
        quizzesEnabled: userPreferences.quizzesEnabled,
        browserNotifications: userPreferences.browserNotifications,
      })
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
    return row
  },

  async upsert(userId: string, row: Preferences, changes: Partial<Preferences>) {
    const insert = db.insert(userPreferences).values({ userId, ...row })
    if (Object.keys(changes).length === 0) {
      await insert.onConflictDoNothing({ target: userPreferences.userId })
      return
    }
    await insert.onConflictDoUpdate({ target: userPreferences.userId, set: changes })
  },
})
