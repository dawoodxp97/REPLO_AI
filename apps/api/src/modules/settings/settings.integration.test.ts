import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { eq, inArray } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { userPreferences } from '../../platform/db/schema'
import { createSettingsService, type SettingsService } from './settings.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

const DEFAULTS = {
  theme: 'system',
  defaultAudience: 'intermediate',
  autoAdvance: true,
  quizzesEnabled: true,
  browserNotifications: false,
}

describe.skipIf(DATABASE_URL === '')('settings against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let settings: SettingsService
  const seeded: string[] = []

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 4 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    settings = createSettingsService({ db })
  })

  afterAll(async () => {
    if (seeded.length > 0) await db.delete(users).where(inArray(users.id, seeded))
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    seeded.push(id)
    await db.insert(users).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  it('returns the defaults for a user with no preferences row and writes nothing', async () => {
    const owner = await seedUser()
    expect(await settings.get(owner)).toEqual(DEFAULTS)
    expect(
      await db.select().from(userPreferences).where(eq(userPreferences.userId, owner)),
    ).toEqual([])
  })

  it('merges a partial update into the stored preferences', async () => {
    const owner = await seedUser()
    expect(await settings.update(owner, { theme: 'dark' })).toEqual({ ...DEFAULTS, theme: 'dark' })

    const expected = {
      ...DEFAULTS,
      theme: 'dark',
      autoAdvance: false,
      defaultAudience: 'expert',
    } as const
    expect(await settings.update(owner, { autoAdvance: false, defaultAudience: 'expert' })).toEqual(
      expected,
    )
    expect(await settings.get(owner)).toEqual(expected)
  })

  it('creates the row with defaults when the patch is empty', async () => {
    const owner = await seedUser()
    expect(await settings.update(owner, {})).toEqual(DEFAULTS)
    expect(
      await db.select().from(userPreferences).where(eq(userPreferences.userId, owner)),
    ).toHaveLength(1)
  })

  it('defaults the theme to system in the database and accepts switching back to it', async () => {
    const owner = await seedUser()
    await db.insert(userPreferences).values({ userId: owner })
    expect((await settings.get(owner)).theme).toBe('system')
    expect((await settings.update(owner, { theme: 'light' })).theme).toBe('light')
    expect((await settings.update(owner, { theme: 'system' })).theme).toBe('system')
  })

  it("never lets one user's update change another user's preferences", async () => {
    const owner = await seedUser()
    const other = await seedUser()
    await settings.update(owner, { theme: 'dark', quizzesEnabled: false })
    await settings.update(other, { browserNotifications: true })

    expect(await settings.get(owner)).toEqual({
      ...DEFAULTS,
      theme: 'dark',
      quizzesEnabled: false,
    })
    expect(await settings.get(other)).toEqual({ ...DEFAULTS, browserNotifications: true })
  })
})
