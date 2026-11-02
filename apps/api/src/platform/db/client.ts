import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as authSchema from './auth-schema'
import * as schema from './schema'

export const fullSchema = { ...authSchema, ...schema }

export interface DbOptions {
  max?: number
  onPoolError?: (err: Error) => void
}

export function createDb(databaseUrl: string, opts: DbOptions = {}) {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    max: opts.max ?? 10,
    connectionTimeoutMillis: 5_000,
    idleTimeoutMillis: 30_000,
    statement_timeout: 30_000,
    idle_in_transaction_session_timeout: 60_000,
  })
  pool.on('error', (err) => opts.onPoolError?.(err))
  const db = drizzle(pool, { schema: fullSchema })
  return { db, pool }
}

export type Db = ReturnType<typeof createDb>['db']
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx
