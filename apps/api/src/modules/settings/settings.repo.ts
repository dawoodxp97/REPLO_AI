import { Preferences } from '@replo/contracts'
import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { userPreferences } from '../../platform/db/schema'

const PREFERENCE_COLUMNS = {
  theme: userPreferences.theme,
  defaultAudience: userPreferences.defaultAudience,
  autoAdvance: userPreferences.autoAdvance,
  quizzesEnabled: userPreferences.quizzesEnabled,
  browserNotifications: userPreferences.browserNotifications,
}

export const PREFERENCE_DEFAULTS: Preferences = Preferences.parse({
  theme: PREFERENCE_COLUMNS.theme.default,
  defaultAudience: PREFERENCE_COLUMNS.defaultAudience.default,
  autoAdvance: PREFERENCE_COLUMNS.autoAdvance.default,
  quizzesEnabled: PREFERENCE_COLUMNS.quizzesEnabled.default,
  browserNotifications: PREFERENCE_COLUMNS.browserNotifications.default,
})

export const settingsRepo = (db: DbOrTx) => ({
  async find(userId: string): Promise<Preferences | undefined> {
    const [row] = await db
      .select(PREFERENCE_COLUMNS)
      .from(userPreferences)
      .where(eq(userPreferences.userId, userId))
      .limit(1)
    return row
  },

  async upsert(userId: string, patch: Partial<Preferences>): Promise<Preferences> {
    const [row] = await db
      .insert(userPreferences)
      .values({ userId, ...patch })
      .onConflictDoUpdate({
        target: userPreferences.userId,
        set: Object.keys(patch).length === 0 ? { userId } : patch,
      })
      .returning(PREFERENCE_COLUMNS)
    if (!row) throw new Error('preferences upsert returned no row')
    return row
  },
})
