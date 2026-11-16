import type { SearchResults } from '@replo/contracts'
import type { RepositoryLibrary } from '../repositories/library.service'
import type { CourseCatalog } from '../courses/catalog.service'

export interface SearchDeps {
  courses: Pick<CourseCatalog, 'searchOwn'>
  repositories: Pick<RepositoryLibrary, 'searchOwn'>
}

export interface SearchService {
  own(userId: string, input: { q: string; limit: number }): Promise<SearchResults>
}

export function createSearchService(deps: SearchDeps): SearchService {
  const { courses, repositories } = deps

  return {
    async own(userId, { q, limit }) {
      const [repositoryHits, courseHits] = await Promise.all([
        repositories.searchOwn(userId, q, limit),
        courses.searchOwn(userId, q, limit),
      ])
      return {
        repositories: repositoryHits,
        courses: courseHits.courses,
        lessons: courseHits.lessons,
      }
    },
  }
}
