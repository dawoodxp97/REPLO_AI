import { and, eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { providerKeys } from '../../platform/db/schema'

export type ProviderKeyRow = typeof providerKeys.$inferSelect

export const keysRepo = (db: DbOrTx) => ({
  list(userId: string) {
    return db
      .select({
        id: providerKeys.id,
        provider: providerKeys.provider,
        label: providerKeys.label,
        last4: providerKeys.last4,
        lastValidatedAt: providerKeys.lastValidatedAt,
        createdAt: providerKeys.createdAt,
      })
      .from(providerKeys)
      .where(eq(providerKeys.userId, userId))
      .orderBy(providerKeys.createdAt)
  },

  async findOwned(userId: string, keyId: string): Promise<ProviderKeyRow | undefined> {
    const [row] = await db
      .select()
      .from(providerKeys)
      .where(and(eq(providerKeys.id, keyId), eq(providerKeys.userId, userId)))
      .limit(1)
    return row
  },

  async findByLabel(userId: string, provider: ProviderKeyRow['provider'], label: string) {
    const [row] = await db
      .select({ id: providerKeys.id })
      .from(providerKeys)
      .where(
        and(
          eq(providerKeys.userId, userId),
          eq(providerKeys.provider, provider),
          eq(providerKeys.label, label),
        ),
      )
      .limit(1)
    return row
  },

  async insert(values: typeof providerKeys.$inferInsert): Promise<ProviderKeyRow | undefined> {
    const [row] = await db.insert(providerKeys).values(values).onConflictDoNothing().returning()
    return row
  },

  async markValidated(keyId: string, at: Date) {
    await db.update(providerKeys).set({ lastValidatedAt: at }).where(eq(providerKeys.id, keyId))
  },

  async delete(keyId: string) {
    await db.delete(providerKeys).where(eq(providerKeys.id, keyId))
  },
})
