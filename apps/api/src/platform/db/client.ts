import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as authSchema from './auth-schema'
import * as schema from './schema'

export const fullSchema = { ...authSchema, ...schema }

export function createDb(databaseUrl: string, opts: { max?: number } = {}) {
  const pool = new pg.Pool({ connectionString: databaseUrl, max: opts.max ?? 10 })
  const db = drizzle(pool, { schema: fullSchema })
  return { db, pool }
}

export type Db = ReturnType<typeof createDb>['db']
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx
