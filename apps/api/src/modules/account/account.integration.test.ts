import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { repositories, tutorials } from '../../platform/db/schema'
import { fixedProgress } from '../../test/domain'
import { createTutorialCatalog } from '../tutorials/catalog.service'
import { createTutorialManager, type TutorialManager } from '../tutorials/manager.service'
import { randomBytes } from 'node:crypto'
import { KeyVault } from '../../platform/crypto/key-vault'
import { createIdentityService } from '../identity/identity.service'
import { createAccountService } from './account.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

const vault = KeyVault.fromEnv(randomBytes(32).toString('base64'), 1)

describe.skipIf(DATABASE_URL === '')('account deletion against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let manager: TutorialManager
  let nextGithubRepoId = 910_000

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 2 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(sql`truncate table users, repositories restart identity cascade`)
    const catalog = createTutorialCatalog({ db, learning: fixedProgress(null) })
    manager = createTutorialManager({ db, catalog, productOrigin: 'https://replo.test' })
  })

  afterAll(async () => {
    await pool.end()
  })

  const accountWith = (tutorialsService: Pick<TutorialManager, 'settleOwnerDeletion'>) =>
    createAccountService({
      db,
      identity: createIdentityService({ db, vault }),
      tutorials: tutorialsService,
    })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(users).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedRepo = async () => {
    nextGithubRepoId += 1
    const [row] = await db
      .insert(repositories)
      .values({
        githubRepoId: nextGithubRepoId,
        owner: 'acme',
        name: `shop-${nextGithubRepoId}`,
        isPrivate: false,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    if (!row) throw new Error('repository seed failed')
    return row.id
  }

  const seedTutorial = async (
    userId: string,
    repositoryId: string,
    visibility: 'private' | 'public',
  ) => {
    const [row] = await db
      .insert(tutorials)
      .values({
        userId,
        repositoryId,
        slug: `walk-${randomUUID().slice(0, 8)}`,
        title: `${visibility} walk`,
        visibility,
      })
      .returning({ id: tutorials.id })
    if (!row) throw new Error('tutorial seed failed')
    return row.id
  }

  const tutorialRow = (tutorialId: string) =>
    db
      .select({ id: tutorials.id, userId: tutorials.userId, visibility: tutorials.visibility })
      .from(tutorials)
      .where(eq(tutorials.id, tutorialId))

  const accountExists = async (userId: string) =>
    (await db.select({ id: users.id }).from(users).where(eq(users.id, userId))).length === 1

  it('anonymise keeps public tutorials without an owner and removes private ones', async () => {
    const owner = await seedUser()
    const publicId = await seedTutorial(owner, await seedRepo(), 'public')
    const privateId = await seedTutorial(owner, await seedRepo(), 'private')

    await accountWith(manager).deleteAccount(owner, {
      confirm: 'DELETE',
      publicTutorials: 'anonymise',
    })

    expect(await tutorialRow(publicId)).toEqual([
      { id: publicId, userId: null, visibility: 'public' },
    ])
    expect(await tutorialRow(privateId)).toEqual([])
    expect(await accountExists(owner)).toBe(false)
  })

  it('delete removes public and private tutorials together with the account', async () => {
    const owner = await seedUser()
    const publicId = await seedTutorial(owner, await seedRepo(), 'public')
    const privateId = await seedTutorial(owner, await seedRepo(), 'private')

    await accountWith(manager).deleteAccount(owner, {
      confirm: 'DELETE',
      publicTutorials: 'delete',
    })

    expect(await tutorialRow(publicId)).toEqual([])
    expect(await tutorialRow(privateId)).toEqual([])
    expect(await accountExists(owner)).toBe(false)
  })

  it('keeps the account and its tutorials when the settlement fails part-way', async () => {
    const owner = await seedUser()
    const publicId = await seedTutorial(owner, await seedRepo(), 'public')
    const failing = accountWith({
      settleOwnerDeletion: async (tx, userId, mode) => {
        await manager.settleOwnerDeletion(tx, userId, mode)
        throw new Error('settlement failed')
      },
    })

    await expect(
      failing.deleteAccount(owner, { confirm: 'DELETE', publicTutorials: 'anonymise' }),
    ).rejects.toThrow('settlement failed')
    expect(await accountExists(owner)).toBe(true)
    expect(await tutorialRow(publicId)).toEqual([
      { id: publicId, userId: owner, visibility: 'public' },
    ])
  })
})
