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
const fileHit = {
  courseId: 'course-1',
  versionId: 'version-1',
  owner: 'acme',
  repo: 'shop',
  slug: 'shop-internals',
  path: 'src/cart.ts',
}
const dashboardHit = { dashboardId: 'dash-1', name: 'Cart funnel' }

interface Results {
  repositories?: (typeof repositoryHit)[]
  courses?: { courses: (typeof courseHit)[]; lessons: (typeof lessonHit)[] }
  files?: (typeof fileHit)[]
  dashboards?: (typeof dashboardHit)[]
}

function stubs(results: Results) {
  const repositorySearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) => results.repositories ?? [],
  )
  const courseSearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) =>
      results.courses ?? { courses: [], lessons: [] },
  )
  const fileSearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) => results.files ?? [],
  )
  const dashboardSearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) => results.dashboards ?? [],
  )
  const deps: SearchDeps = {
    repositories: { searchOwn: repositorySearch },
    courses: { searchOwn: courseSearch, searchFiles: fileSearch },
    dashboards: { searchOwn: dashboardSearch },
  }
  return { deps, repositorySearch, courseSearch, fileSearch, dashboardSearch }
}

describe('search all', () => {
  it('passes the query and the limit to every owned search', async () => {
    const { deps, repositorySearch, courseSearch, fileSearch, dashboardSearch } = stubs({})
    await createSearchService(deps).all('user-1', { q: 'shop', limit: 5 })
    expect(repositorySearch).toHaveBeenCalledWith('user-1', 'shop', 5)
    expect(courseSearch).toHaveBeenCalledWith('user-1', 'shop', 5)
    expect(fileSearch).toHaveBeenCalledWith('user-1', 'shop', 5)
    expect(dashboardSearch).toHaveBeenCalledWith('user-1', 'shop', 5)
  })

  it('returns every group the owned searches return', async () => {
    const { deps } = stubs({
      repositories: [repositoryHit],
      courses: { courses: [courseHit], lessons: [lessonHit] },
      files: [fileHit],
      dashboards: [dashboardHit],
    })
    expect(await createSearchService(deps).all('user-1', { q: 'shop', limit: 10 })).toEqual({
      repositories: [repositoryHit],
      courses: [courseHit],
      lessons: [lessonHit],
      files: [fileHit],
      dashboards: [dashboardHit],
    })
  })

  it('returns empty groups when nothing the user owns matches', async () => {
    const { deps } = stubs({})
    expect(await createSearchService(deps).all('user-1', { q: 'nothing', limit: 10 })).toEqual({
      repositories: [],
      courses: [],
      lessons: [],
      files: [],
      dashboards: [],
    })
  })
})
