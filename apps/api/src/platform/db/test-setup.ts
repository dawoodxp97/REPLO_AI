import { readdir, readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import type pg from 'pg'
import type { DbPool } from './client'

const ddlDir = new URL('../../../db/ddl/', import.meta.url)

async function ddlFiles(): Promise<string[]> {
  return (await readdir(fileURLToPath(ddlDir))).filter((name) => /^\d+.*\.sql$/.test(name)).sort()
}

async function applyFiles(client: pg.PoolClient, files: string[]): Promise<void> {
  for (const file of files) {
    const ddl = await readFile(new URL(file, ddlDir), 'utf8')
    await client.query(ddl)
  }
}

export async function applyDdl(pool: DbPool): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query('select pg_advisory_lock(74219031)')
    const users = await client.query<{ exists: boolean }>(
      "select to_regclass('public.users') is not null as exists",
    )
    if (users.rows[0]?.exists) {
      const courses = await client.query<{ exists: boolean }>(
        "select to_regclass('public.courses') is not null as exists",
      )
      if (courses.rows[0]?.exists) return
      await applyFiles(
        client,
        (await ddlFiles()).filter((name) => !name.startsWith('0000')),
      )
      return
    }
    await applyFiles(client, await ddlFiles())
  } finally {
    await client.query('select pg_advisory_unlock(74219031)')
    client.release()
  }
}
