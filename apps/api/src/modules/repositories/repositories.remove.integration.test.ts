import { randomUUID } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { and, eq, sql } from 'drizzle-orm'
import { migrate } from 'drizzle-orm/node-postgres/migrator'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { user } from '../../platform/db/auth-schema'
import { createDb, type Db } from '../../platform/db/client'
import { repositories, tutorials, userRepositories } from '../../platform/db/schema'
import { createJobHistory } from '../generation/job-history.service'
import { fixedProgress } from '../../test/domain'
import { createTutorialLibrary } from '../tutorials/library.service'
import { createTutorialManager } from '../tutorials/manager.service'
import { createTutorialReader } from '../tutorials/reader.service'
import { createRepositoryLibrary, type RepositoryLibrary } from './library.service'

const DATABASE_URL = process.env.TEST_DATABASE_URL ?? ''

describe.skipIf(DATABASE_URL === '')('repository removal and search across users', () => {
  let db: Db
  let pool: ReturnType<typeof createDb>['pool']
  let repositoriesService: RepositoryLibrary
  let nextGithubRepoId = 920_000

  beforeAll(async () => {
    const created = createDb(DATABASE_URL, { max: 2 })
    db = created.db
    pool = created.pool
    await migrate(db, {
      migrationsFolder: fileURLToPath(new URL('../../../drizzle', import.meta.url)),
    })
    await db.execute(sql`truncate table "user", repositories restart identity cascade`)
    const library = createTutorialLibrary({
      db,
      indexing: {
        readFile: async () => undefined,
        listFiles: async () => [],
        readText: async () => undefined,
        snapshotRef: async () => undefined,
      },
      reader: createTutorialReader(db),
      learning: fixedProgress(null),
    })
    repositoriesService = createRepositoryLibrary({
      db,
      jobs: createJobHistory(db),
      tutorials: createTutorialManager({ db, library, productOrigin: 'https://replo.test' }),
    })
  })

  afterAll(async () => {
    await pool.end()
  })

  const seedUser = async () => {
    const id = randomUUID()
    await db.insert(user).values({ id, name: 'Developer', email: `${id}@test.invalid` })
    return id
  }

  const seedRepo = async (name: string) => {
    nextGithubRepoId += 1
    const [row] = await db
      .insert(repositories)
      .values({
        githubRepoId: nextGithubRepoId,
        owner: 'acme',
        name,
        isPrivate: false,
        defaultBranch: 'main',
      })
      .returning({ id: repositories.id })
    if (!row) throw new Error('repository seed failed')
    return row.id
  }

  const link = (userId: string, repositoryId: string) =>
    db.insert(userRepositories).values({ userId, repositoryId, installationId: null })

  const seedTutorial = (userId: string, repositoryId: string, slug: string) =>
    db.insert(tutorials).values({
      userId,
      repositoryId,
      slug,
      title: `${slug} walk`,
      visibility: 'private',
    })

  const tutorialsOf = (userId: string, repositoryId: string) =>
    db
      .select({ slug: tutorials.slug })
      .from(tutorials)
      .where(and(eq(tutorials.userId, userId), eq(tutorials.repositoryId, repositoryId)))

  const linkOf = async (userId: string, repositoryId: string) => {
    const [row] = await db
      .select({ revokedAt: userRepositories.revokedAt })
      .from(userRepositories)
      .where(
        and(eq(userRepositories.userId, userId), eq(userRepositories.repositoryId, repositoryId)),
      )
    return row
  }

  it('revokes the caller link and deletes the caller tutorials for that repository', async () => {
    const owner = await seedUser()
    const repoId = await seedRepo('remove-own')
    await link(owner, repoId)
    await seedTutorial(owner, repoId, 'own-walk')

    await repositoriesService.remove(owner, repoId)

    expect((await linkOf(owner, repoId))?.revokedAt).toBeInstanceOf(Date)
    expect(await tutorialsOf(owner, repoId)).toEqual([])
    expect((await repositoriesService.list(owner, { limit: 25 })).items).toEqual([])
  })

  it('keeps another user’s tutorials and link for the same repository', async () => {
    const owner = await seedUser()
    const other = await seedUser()
    const repoId = await seedRepo('remove-shared')
    await link(owner, repoId)
    await link(other, repoId)
    await seedTutorial(owner, repoId, 'owner-walk')
    await seedTutorial(other, repoId, 'other-walk')

    await repositoriesService.remove(owner, repoId)

    expect(await tutorialsOf(owner, repoId)).toEqual([])
    expect(await tutorialsOf(other, repoId)).toEqual([{ slug: 'other-walk' }])
    expect((await linkOf(other, repoId))?.revokedAt).toBeNull()
    expect(
      (await repositoriesService.list(other, { limit: 25 })).items.map((item) => item.repositoryId),
    ).toEqual([repoId])
  })

  it('refuses to remove a repository the caller has not linked, and touches nothing', async () => {
    const owner = await seedUser()
    const stranger = await seedUser()
    const repoId = await seedRepo('remove-guarded')
    await link(owner, repoId)
    await seedTutorial(owner, repoId, 'guarded-walk')

    await expect(repositoriesService.remove(stranger, repoId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
    expect((await linkOf(owner, repoId))?.revokedAt).toBeNull()
    expect(await tutorialsOf(owner, repoId)).toEqual([{ slug: 'guarded-walk' }])
  })

  it('treats a second removal of the same repository as not found', async () => {
    const owner = await seedUser()
    const repoId = await seedRepo('remove-twice')
    await link(owner, repoId)
    await repositoriesService.remove(owner, repoId)

    await expect(repositoriesService.remove(owner, repoId)).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })
  })

  it('searchOwn never returns another user’s repositories or revoked links', async () => {
    const owner = await seedUser()
    const other = await seedUser()
    const token = `vault${randomUUID().slice(0, 8)}`
    const mine = await seedRepo(`${token}-mine`)
    const theirs = await seedRepo(`${token}-theirs`)
    const revoked = await seedRepo(`${token}-retired`)
    await link(owner, mine)
    await link(other, theirs)
    await link(owner, revoked)
    await repositoriesService.remove(owner, revoked)

    const ownerHits = await repositoriesService.searchOwn(owner, token, 25)
    const otherHits = await repositoriesService.searchOwn(other, token, 25)
    expect(ownerHits.map((hit) => hit.repositoryId)).toEqual([mine])
    expect(otherHits.map((hit) => hit.repositoryId)).toEqual([theirs])
  })

  it('describeLinked returns only the caller’s live links', async () => {
    const owner = await seedUser()
    const other = await seedUser()
    const own = await seedRepo('describe-own')
    const foreign = await seedRepo('describe-foreign')
    const revoked = await seedRepo('describe-revoked')
    await link(owner, own)
    await link(other, foreign)
    await link(owner, revoked)
    await repositoriesService.remove(owner, revoked)

    const described = await repositoriesService.describeLinked(owner, [own, foreign, revoked])
    expect([...described.keys()]).toEqual([own])
    expect(described.get(own)).toEqual({ owner: 'acme', name: 'describe-own' })
  })
})
