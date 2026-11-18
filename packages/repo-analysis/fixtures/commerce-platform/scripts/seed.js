const { Pool } = require('pg')

const pool = new Pool({ connectionString: process.env.DATABASE_URL })

async function seed() {
  await pool.query("insert into products (name, price_cents, stock) values ('Notebook', 1200, 40)")
  await pool.end()
}

seed().catch((error) => {
  console.error(error)
  process.exit(1)
})
