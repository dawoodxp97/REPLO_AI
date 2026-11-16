import { describe, expect, it, vi } from 'vitest'
import { createSearchService, type SearchDeps } from './search.service'

const repositoryHit = { repositoryId: 'repo-shop', owner: 'acme', name: 'shop' }
const courseHit = {
  courseId: 'course-1',
  title: 'Shop internals',
  owner: 'acme',
  repo: 'shop',
  slug: 'shop-internals',
}
const lessonHit = {
  courseId: 'course-1',
  courseTitle: 'Shop internals',
  owner: 'acme',
  repo: 'shop',
  slug: 'shop-internals',
  versionId: 'version-1',
  chapterKey: 'chapter-1',
  lessonKey: 'lesson-2',
  title: 'Checkout flow',
}

interface Results {
  repositories?: (typeof repositoryHit)[]
  courses?: { courses: (typeof courseHit)[]; lessons: (typeof lessonHit)[] }
}

function stubs(results: Results) {
  const repositorySearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) => results.repositories ?? [],
  )
  const courseSearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) =>
      results.courses ?? { courses: [], lessons: [] },
  )
  const deps: SearchDeps = {
    repositories: { searchOwn: repositorySearch },
    courses: { searchOwn: courseSearch },
  }
  return { deps, repositorySearch, courseSearch }
}

describe('search own', () => {
  it('passes the query and the limit to both owned searches', async () => {
    const { deps, repositorySearch, courseSearch } = stubs({})
    await createSearchService(deps).own('user-1', { q: 'shop', limit: 5 })
    expect(repositorySearch).toHaveBeenCalledWith('user-1', 'shop', 5)
    expect(courseSearch).toHaveBeenCalledWith('user-1', 'shop', 5)
  })

  it('returns exactly the repositories, courses and lessons the owned searches return', async () => {
    const { deps } = stubs({
      repositories: [repositoryHit],
      courses: { courses: [courseHit], lessons: [lessonHit] },
    })
    expect(await createSearchService(deps).own('user-1', { q: 'shop', limit: 10 })).toEqual({
      repositories: [repositoryHit],
      courses: [courseHit],
      lessons: [lessonHit],
    })
  })

  it('returns empty lists when nothing the user owns matches', async () => {
    const { deps } = stubs({})
    expect(await createSearchService(deps).own('user-1', { q: 'nothing', limit: 10 })).toEqual({
      repositories: [],
      courses: [],
      lessons: [],
    })
  })
})
