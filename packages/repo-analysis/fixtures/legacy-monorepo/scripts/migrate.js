const { readFile } = require('node:fs/promises')
const { join } = require('node:path')
const { Pool } = require('pg')

async function migrate() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  const sql = await readFile(join(__dirname, '..', 'db', 'schema.sql'), 'utf8')
  await pool.query(sql)
  await pool.end()
}

migrate().catch((error) => {
  console.error(error)
  process.exit(1)
})
