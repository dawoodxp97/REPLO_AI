import { describe, expect, it, vi } from 'vitest'
import { createSearchService, type SearchDeps } from './search.service'

const repositoryHit = { repositoryId: 'repo-shop', owner: 'acme', name: 'shop' }
const tutorialHit = {
  tutorialId: 'tutorial-1',
  title: 'Shop internals',
  owner: 'acme',
  repo: 'shop',
  slug: 'shop-internals',
}
const lessonHit = {
  tutorialId: 'tutorial-1',
  versionId: 'version-1',
  chapterKey: 'chapter-1',
  lessonKey: 'lesson-2',
  title: 'Checkout flow',
}

interface Results {
  repositories?: (typeof repositoryHit)[]
  tutorials?: { tutorials: (typeof tutorialHit)[]; lessons: (typeof lessonHit)[] }
}

function stubs(results: Results) {
  const repositorySearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) => results.repositories ?? [],
  )
  const tutorialSearch = vi.fn(
    async (_userId: string, _query: string, _limit: number) =>
      results.tutorials ?? { tutorials: [], lessons: [] },
  )
  const deps: SearchDeps = {
    repositories: { searchOwn: repositorySearch },
    tutorials: { searchOwn: tutorialSearch },
  }
  return { deps, repositorySearch, tutorialSearch }
}

describe('search own', () => {
  it('passes the query and the limit to both owned searches', async () => {
    const { deps, repositorySearch, tutorialSearch } = stubs({})
    await createSearchService(deps).own('user-1', { q: 'shop', limit: 5 })
    expect(repositorySearch).toHaveBeenCalledWith('user-1', 'shop', 5)
    expect(tutorialSearch).toHaveBeenCalledWith('user-1', 'shop', 5)
  })

  it('returns exactly the repositories, tutorials and lessons the owned searches return', async () => {
    const { deps } = stubs({
      repositories: [repositoryHit],
      tutorials: { tutorials: [tutorialHit], lessons: [lessonHit] },
    })
    expect(await createSearchService(deps).own('user-1', { q: 'shop', limit: 10 })).toEqual({
      repositories: [repositoryHit],
      tutorials: [tutorialHit],
      lessons: [lessonHit],
    })
  })

  it('returns empty lists when nothing the user owns matches', async () => {
    const { deps } = stubs({})
    expect(await createSearchService(deps).own('user-1', { q: 'nothing', limit: 10 })).toEqual({
      repositories: [],
      tutorials: [],
      lessons: [],
    })
  })
})
