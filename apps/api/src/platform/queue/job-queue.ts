import { sql, type SQL } from 'drizzle-orm'
import type PgBoss from 'pg-boss'
import type { Tx } from '../db/client'

interface EnqueueOptions {
  singletonKey: string
  tx?: Tx
}

export interface JobQueue {
  send(name: string, data: object, options: EnqueueOptions): Promise<string | null>
}

const PLACEHOLDER = /\$(\d+)/g

export function bindPlaceholders(text: string, values: readonly unknown[]): SQL {
  const parts: SQL[] = []
  let cursor = 0
  for (const match of text.matchAll(PLACEHOLDER)) {
    const start = match.index
    const index = Number(match[1]) - 1
    if (index < 0 || index >= values.length) throw new Error(`no value for placeholder ${match[0]}`)
    parts.push(sql.raw(text.slice(cursor, start)))
    parts.push(sql`${values[index] ?? null}`)
    cursor = start + match[0].length
  }
  parts.push(sql.raw(text.slice(cursor)))
  return sql.join(parts)
}

const transactionExecutor = (tx: Tx) => ({
  async executeSql(text: string, values: readonly unknown[]) {
    const result = await tx.execute(bindPlaceholders(text, values))
    return { rows: result.rows }
  },
})

export function pgBossQueue(boss: PgBoss): JobQueue {
  return {
    send(name, data, { singletonKey, tx }) {
      return boss.send(name, data, {
        singletonKey,
        ...(tx ? { db: transactionExecutor(tx) } : {}),
      })
    },
  }
}
