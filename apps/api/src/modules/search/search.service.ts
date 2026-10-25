import type { SearchResults } from '@replo/contracts'
import type { RepositoryLibrary } from '../repositories/library.service'
import type { TutorialLibrary } from '../tutorials/library.service'

export interface SearchDeps {
  tutorials: Pick<TutorialLibrary, 'searchOwn'>
  repositories: Pick<RepositoryLibrary, 'searchOwn'>
}

export interface SearchService {
  own(userId: string, input: { q: string; limit: number }): Promise<SearchResults>
}

export function createSearchService(deps: SearchDeps): SearchService {
  const { tutorials, repositories } = deps

  return {
    async own(userId, { q, limit }) {
      const [repositoryHits, tutorialHits] = await Promise.all([
        repositories.searchOwn(userId, q, limit),
        tutorials.searchOwn(userId, q, limit),
      ])
      return {
        repositories: repositoryHits,
        tutorials: tutorialHits.tutorials,
        lessons: tutorialHits.lessons,
      }
    },
  }
}
