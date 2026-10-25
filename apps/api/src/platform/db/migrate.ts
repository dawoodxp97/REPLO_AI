import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { fileURLToPath } from 'node:url'
import { z } from 'zod'
import { createDb } from './client'

const env = z.object({ DATABASE_URL: z.string().min(1) }).safeParse(process.env)
if (!env.success) {
  console.error('DATABASE_URL is required')
  process.exit(1)
}

const { db, pool } = createDb(env.data.DATABASE_URL, { max: 1 })
try {
  await migrate(db, {
    migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
  })
  console.log('migrations applied')
} finally {
  await pool.end()
}
