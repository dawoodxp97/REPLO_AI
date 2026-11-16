import { randomUUID } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { applyDdl } from '../../platform/db/test-setup'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { users } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { repositories, courses } from '../../platform/db/schema'
import { createCourseManager, type CourseManager } from '../courses/manager.service'
import { randomBytes } from 'node:crypto'
import { KeyVault } from '../../platform/crypto/key-vault'
import { createIdentityService } from '../identity/identity.service'
import { createAccountService } from './account.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

const vault = KeyVault.fromEnv(randomBytes(32).toString('base64'), 1)

describe.skipIf(DATABASE_URL === '')('account deletion against Postgres', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let manager: CourseManager
  let nextGithubRepoId = 910_000

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 2 })
    db = created.db
    pool = created.pool
    await applyDdl(pool)
    await db.execute(sql`truncate table users, repositories restart identity cascade`)
    manager = createCourseManager({ db })
  })

  afterAll(async () => {
    await pool.end()
  })

  const accountWith = (coursesService: Pick<CourseManager, 'settleOwnerDeletion'>) =>
    createAccountService({
      db,
      identity: createIdentityService({ db, vault }),
      courses: coursesService,
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

  const seedCourse = async (userId: string, repositoryId: string) => {
    const [row] = await db
      .insert(courses)
      .values({
        userId,
        repositoryId,
        slug: `walk-${randomUUID().slice(0, 8)}`,
        title: 'walk',
      })
      .returning({ id: courses.id })
    if (!row) throw new Error('course seed failed')
    return row.id
  }

  const courseRow = (courseId: string) =>
    db
      .select({ id: courses.id, userId: courses.userId })
      .from(courses)
      .where(eq(courses.id, courseId))

  const accountExists = async (userId: string) =>
    (await db.select({ id: users.id }).from(users).where(eq(users.id, userId))).length === 1

  it('deletes every course with the account', async () => {
    const owner = await seedUser()
    const courseId = await seedCourse(owner, await seedRepo())

    await accountWith(manager).deleteAccount(owner, { confirm: 'DELETE' })

    expect(await courseRow(courseId)).toEqual([])
    expect(await accountExists(owner)).toBe(false)
  })

  it('keeps the account and its courses when the settlement fails part-way', async () => {
    const owner = await seedUser()
    const courseId = await seedCourse(owner, await seedRepo())
    const failing = accountWith({
      settleOwnerDeletion: async (tx, userId) => {
        await manager.settleOwnerDeletion(tx, userId)
        throw new Error('settlement failed')
      },
    })

    await expect(failing.deleteAccount(owner, { confirm: 'DELETE' })).rejects.toThrow(
      'settlement failed',
    )
    expect(await accountExists(owner)).toBe(true)
    expect(await courseRow(courseId)).toEqual([{ id: courseId, userId: owner }])
  })
})
