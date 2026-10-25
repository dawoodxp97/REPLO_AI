import type { CustomModels, ModelPreset } from '@replo/contracts'
import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { modelPreferences } from '../../platform/db/schema'

export const modelsRepo = (db: DbOrTx) => ({
  async find(userId: string) {
    const [row] = await db
      .select()
      .from(modelPreferences)
      .where(eq(modelPreferences.userId, userId))
      .limit(1)
    return row
  },

  async upsert(
    userId: string,
    values: {
      preset: ModelPreset
      customModels: CustomModels | null
      defaultBudgetMicros: number | null
    },
  ) {
    await db
      .insert(modelPreferences)
      .values({ userId, ...values })
      .onConflictDoUpdate({ target: modelPreferences.userId, set: values })
  },
})
