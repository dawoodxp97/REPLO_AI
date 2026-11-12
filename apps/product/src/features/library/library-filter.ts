import type { TutorialSummaryDto, Visibility } from '@replo/contracts'

export type VisibilityFilter = 'all' | Visibility
export type LibrarySort = 'updated' | 'title' | 'progress'

export interface LibraryFilter {
  query: string
  visibility: VisibilityFilter
  sort: LibrarySort
  hideFinished: boolean
}

export const DEFAULT_LIBRARY_FILTER: LibraryFilter = {
  query: '',
  visibility: 'all',
  sort: 'updated',
  hideFinished: false,
}

export const LIBRARY_SORT_LABELS: Record<LibrarySort, string> = {
  updated: 'Recently updated',
  title: 'Title',
  progress: 'Most read',
}

const SORTERS: Record<LibrarySort, (a: TutorialSummaryDto, b: TutorialSummaryDto) => number> = {
  updated: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  title: (a, b) => a.title.localeCompare(b.title),
  progress: (a, b) => (b.progress ?? 0) - (a.progress ?? 0),
}

export function isFiltering(filter: LibraryFilter): boolean {
  return filter.query.trim() !== '' || filter.visibility !== 'all' || filter.hideFinished
}

export function applyLibraryFilter(
  tutorials: readonly TutorialSummaryDto[],
  filter: LibraryFilter,
): TutorialSummaryDto[] {
  const query = filter.query.trim().toLowerCase()
  return tutorials
    .filter((tutorial) => {
      if (filter.visibility !== 'all' && tutorial.visibility !== filter.visibility) return false
      if (filter.hideFinished && tutorial.progress === 1) return false
      if (query === '') return true
      const haystack = `${tutorial.title} ${tutorial.owner}/${tutorial.repo}`.toLowerCase()
      return haystack.includes(query)
    })
    .sort(SORTERS[filter.sort])
}
