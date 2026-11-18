import { drizzle } from 'drizzle-orm/node-postgres'
import pg from 'pg'
import * as authSchema from './auth-schema'
import * as schema from './schema'

export const fullSchema = { ...authSchema, ...schema }

export interface DbOptions {
  max?: number
  onPoolError?: (err: Error) => void
  // On Workers, a TCP socket belongs to the request that opened it: workerd
  // closes it when the request ends, so a pg.Pool that carries an idle client
  // into the next request deadlocks on its next query. The Cloudflare runtime
  // therefore opens one short-lived connection per query (and one per
  // transaction), which is also the pattern Cloudflare documents for
  // Hyperdrive. Node entrypoints keep the long-lived pool.
  perQuery?: boolean
}

const CONNECTION_TIMEOUT_MS = 5_000
const STATEMENT_TIMEOUT_MS = 30_000
const IDLE_IN_TRANSACTION_TIMEOUT_MS = 60_000

type QueryConfig = string | pg.QueryConfig
type QueryCallback = (err: Error | null, result: pg.QueryResult) => void
type ScopedClient = pg.Client & { closing?: boolean }

// A pg.Pool-shaped object that never holds a connection between calls. It
// satisfies the subset of the pg API that Drizzle's node-postgres driver uses:
// query(), connect() (for transactions, whose client is released at the end),
// end(), and the 'error' listener.
class RequestScopedPool {
  private errorListener: ((err: Error) => void) | undefined

  constructor(
    private readonly databaseUrl: string,
    onPoolError?: (err: Error) => void,
  ) {
    this.errorListener = onPoolError
  }

  private newClient(): ScopedClient {
    const client = new pg.Client({
      connectionString: this.databaseUrl,
      connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
      statement_timeout: STATEMENT_TIMEOUT_MS,
      idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
    }) as ScopedClient
    // pg surfaces the socket teardown after end() as an 'error' event on
    // Workers ("This socket has been closed."). That is expected here: the
    // connection is one-shot, so only errors raised while it is live matter.
    client.on('error', (err) => {
      if (!client.closing) this.errorListener?.(err)
    })
    return client
  }

  async connect(): Promise<pg.PoolClient> {
    const client = this.newClient()
    await client.connect()
    // Drizzle releases a transaction's client with release(); ending the
    // client also closes the socket instead of handing it to a pool that
    // cannot survive the request boundary.
    const releasable = client as unknown as pg.PoolClient
    releasable.release = () => {
      client.closing = true
      void client.end().catch(() => {})
    }
    return releasable
  }

  query(config: QueryConfig): Promise<pg.QueryResult>
  query(config: QueryConfig, values: unknown[]): Promise<pg.QueryResult>
  query(config: QueryConfig, callback: QueryCallback): void
  query(config: QueryConfig, values: unknown[], callback: QueryCallback): void
  query(
    config: QueryConfig,
    values?: unknown[] | QueryCallback,
    callback?: QueryCallback,
  ): Promise<pg.QueryResult> | void {
    const valuesArray = Array.isArray(values) ? values : undefined
    const done = typeof values === 'function' ? values : callback
    const run = async (): Promise<pg.QueryResult> => {
      const client = this.newClient()
      try {
        await client.connect()
        return valuesArray === undefined
          ? await client.query(config)
          : await client.query(config as pg.QueryConfig, valuesArray)
      } finally {
        client.closing = true
        await client.end().catch(() => {})
      }
    }
    if (done) {
      run().then(
        (result) => done(null, result),
        (err: Error) => done(err, undefined as unknown as pg.QueryResult),
      )
      return
    }
    return run()
  }

  // Nothing is held between calls, so shutdown has nothing to drain.
  end(): Promise<void> {
    return Promise.resolve()
  }

  on(event: 'error', listener: (err: Error) => void): this {
    if (event === 'error') this.errorListener = listener
    return this
  }
}

export type DbPool = pg.Pool | RequestScopedPool

export function createDb(databaseUrl: string, opts: DbOptions = {}) {
  const pool: DbPool = opts.perQuery
    ? new RequestScopedPool(databaseUrl, opts.onPoolError)
    : new pg.Pool({
        connectionString: databaseUrl,
        max: opts.max ?? 10,
        connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
        idleTimeoutMillis: 30_000,
        statement_timeout: STATEMENT_TIMEOUT_MS,
        idle_in_transaction_session_timeout: IDLE_IN_TRANSACTION_TIMEOUT_MS,
      })
  if (pool instanceof pg.Pool) {
    pool.on('error', (err) => opts.onPoolError?.(err))
  }
  const db = drizzle(pool as pg.Pool, { schema: fullSchema })
  return { db, pool }
}

export type Db = ReturnType<typeof createDb>['db']
export type Tx = Parameters<Parameters<Db['transaction']>[0]>[0]
export type DbOrTx = Db | Tx
