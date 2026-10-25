import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { user } from '../../platform/db/auth-schema'

export const identityRepo = (db: DbOrTx) => ({
  async deleteUser(userId: string): Promise<void> {
    await db.delete(user).where(eq(user.id, userId))
  },
})
