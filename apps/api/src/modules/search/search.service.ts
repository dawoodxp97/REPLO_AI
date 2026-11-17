import type { SearchResults } from '@replo/contracts'
import type { RepositoryLibrary } from '../repositories/library.service'
import type { CourseCatalog } from '../courses/catalog.service'

export interface SearchDeps {
  courses: Pick<CourseCatalog, 'searchOwn' | 'searchFiles'>
  repositories: Pick<RepositoryLibrary, 'searchOwn'>
  dashboards: { searchOwn(userId: string, query: string, limit: number): Promise<SearchResults['dashboards']> }
}

export interface SearchService {
  all(userId: string, input: { q: string; limit: number }): Promise<SearchResults>
}

export function createSearchService(deps: SearchDeps): SearchService {
  const { courses, repositories, dashboards } = deps

  return {
    async all(userId, { q, limit }) {
      const [repositoryHits, courseHits, fileHits, dashboardHits] = await Promise.all([
        repositories.searchOwn(userId, q, limit),
        courses.searchOwn(userId, q, limit),
        courses.searchFiles(userId, q, limit),
        dashboards.searchOwn(userId, q, limit),
      ])
      return {
        repositories: repositoryHits,
        courses: courseHits.courses,
        lessons: courseHits.lessons,
        files: fileHits,
        dashboards: dashboardHits,
      }
    },
  }
}