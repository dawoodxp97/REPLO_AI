import { eq } from 'drizzle-orm'
import type { DbOrTx } from '../../platform/db/client'
import { operators } from '../../platform/db/schema'

export const operatorRepo = (db: DbOrTx) => ({
  async isOperator(userId: string): Promise<boolean> {
    const [row] = await db
      .select({ userId: operators.userId })
      .from(operators)
      .where(eq(operators.userId, userId))
      .limit(1)
    return row !== undefined
  },
})
