// Ordered, idempotent DDL migration runner for the numbered .sql files in
// `apps/api/db/ddl`. Every file is applied at most once per database; applied
// filenames are recorded in the `_schema_migrations` table.
//
// - Each file runs inside a transaction that first takes the transaction-scoped
//   advisory lock `pg_advisory_xact_lock(hashtext('replo-ddl'))`, so concurrent
//   runners serialize instead of racing.
// - A file's SQL is executed with node-postgres' simple-query path (no
//   parameters), which supports multi-statement strings — including DO $$ ...
//   $$ blocks and functions — so files are NOT split naively on ';'.
// - If any statement in a file fails, the whole file's transaction is rolled
//   back and the script exits non-zero (equivalent to psql ON_ERROR_STOP=1).
// - Drizzle-style `--> statement-breakpoint` markers are converted to ';'.
//
// Usage: pnpm --filter @replo/api db:migrate
// (reads DATABASE_URL from the environment; tsx loads apps/api/.env if present)
import { readdirSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const ddlDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'db', 'ddl')

const ddlFiles = readdirSync(ddlDir)
  .filter((name) => /^\d[\w.-]*\.sql$/i.test(name))
  .sort()

const MIGRATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS _schema_migrations (
    filename text PRIMARY KEY,
    applied_at timestamptz NOT NULL DEFAULT now()
  )
`

function sqlForFile(raw: string): string {
  // Drizzle emits `--> statement-breakpoint` between statements instead of ';'.
  // It is a SQL comment, so leaving it would fuse statements together; replace
  // it with a statement separator. Files that already use ';' are unaffected.
  return raw.replace(/--> statement-breakpoint/g, ';')
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error('DATABASE_URL is not set.')
    process.exit(1)
  }

  const pool = new pg.Pool({ connectionString: databaseUrl, max: 1 })

  try {
    await pool.query(MIGRATIONS_TABLE)

    const { rows } = await pool.query<{ filename: string }>(
      'SELECT filename FROM _schema_migrations',
    )
    const applied = new Set(rows.map((r) => r.filename))

    const pending = ddlFiles.filter((name) => !applied.has(name))
    const skipped: string[] = []
    const appliedNow: string[] = []

    for (const filename of pending) {
      const client = await pool.connect()
      try {
        await client.query('BEGIN')
        // Serialize concurrent runners for the duration of this transaction.
        await client.query("SELECT pg_advisory_xact_lock(hashtext('replo-ddl'))")
        // Re-check under the lock in case another runner applied it meanwhile.
        const { rows: still } = await client.query<{ filename: string }>(
          'SELECT filename FROM _schema_migrations WHERE filename = $1',
          [filename],
        )
        if (still.length > 0) {
          await client.query('COMMIT')
          skipped.push(filename)
          continue
        }

        const sql = sqlForFile(readFileSync(path.join(ddlDir, filename), 'utf8'))
        // Simple query (no parameters): node-postgres sends the whole string as
        // one Query message, so multi-statement SQL — including DO $$ blocks —
        // runs as a single implicit transaction on the server.
        await client.query(sql)
        await client.query('INSERT INTO _schema_migrations(filename) VALUES ($1)', [filename])
        await client.query('COMMIT')
        appliedNow.push(filename)
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {})
        console.error(`\nFailed while applying ${filename}:`)
        console.error(error instanceof Error ? error.message : error)
        process.exitCode = 1
        break
      } finally {
        client.release()
      }
    }

    console.log(`\nDDL migration summary (${ddlDir}):`)
    if (appliedNow.length > 0) {
      console.log(`  applied: ${appliedNow.join(', ')}`)
    } else {
      console.log('  applied: (none)')
    }
    if (skipped.length > 0) {
      console.log(`  skipped (raced): ${skipped.join(', ')}`)
    }
    const already = ddlFiles.length - pending.length + skipped.length
    if (already > 0) {
      console.log(`  already applied: ${already} file(s)`)
    }
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
