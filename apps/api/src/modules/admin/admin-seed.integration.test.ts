import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { applyDdl } from '../../platform/db/test-setup'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { createAdminSeeder } from './admin-seed'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

describe.skipIf(DATABASE_URL === '')('admin seeding against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']

  const insertUser = async (email: string) => {
    const id = randomUUID()
    await db.insert(users).values({ id, name: 'Developer', email, emailVerified: true })
    return id
  }

  const roleOf = async (id: string) => {
    const [row] = await db.select({ role: users.role }).from(users).where(eq(users.id, id))
    return row?.role
  }

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 2 })
    db = created.db
    pool = created.pool
    await applyDdl(pool)
  })

  afterAll(async () => {
    await pool.end()
  })

  beforeEach(async () => {
    await db.delete(users)
  })

  it('promotes a user whose email is listed', async () => {
    const id = await insertUser('ada@example.com')
    await createAdminSeeder(db).seed('ada@example.com')
    expect(await roleOf(id)).toBe('admin')
  })

  it('leaves other users untouched', async () => {
    const admin = await insertUser('ada@example.com')
    const other = await insertUser('grace@example.com')
    await createAdminSeeder(db).seed('ada@example.com')
    expect(await roleOf(admin)).toBe('admin')
    expect(await roleOf(other)).toBe('user')
  })

  it('does nothing when the list is empty', async () => {
    const id = await insertUser('ada@example.com')
    await createAdminSeeder(db).seed(undefined)
    expect(await roleOf(id)).toBe('user')
  })
})