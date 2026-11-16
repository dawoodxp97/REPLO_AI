import type { CourseSummaryDto } from '@replo/contracts'

export type LibrarySort = 'updated' | 'title' | 'progress'

export interface LibraryFilter {
  query: string
  sort: LibrarySort
  hideFinished: boolean
}

export const DEFAULT_LIBRARY_FILTER: LibraryFilter = {
  query: '',
  sort: 'updated',
  hideFinished: false,
}

export const LIBRARY_SORT_LABELS: Record<LibrarySort, string> = {
  updated: 'Recently updated',
  title: 'Title',
  progress: 'Most read',
}

const SORTERS: Record<LibrarySort, (a: CourseSummaryDto, b: CourseSummaryDto) => number> = {
  updated: (a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt),
  title: (a, b) => a.title.localeCompare(b.title),
  progress: (a, b) => (b.progress ?? 0) - (a.progress ?? 0),
}

export function isFiltering(filter: LibraryFilter): boolean {
  return filter.query.trim() !== '' || filter.hideFinished
}

export function applyLibraryFilter(
  courses: readonly CourseSummaryDto[],
  filter: LibraryFilter,
): CourseSummaryDto[] {
  const query = filter.query.trim().toLowerCase()
  return courses
    .filter((course) => {
      if (filter.hideFinished && course.progress === 1) return false
      if (query === '') return true
      const haystack = `${course.title} ${course.owner}/${course.repo}`.toLowerCase()
      return haystack.includes(query)
    })
    .sort(SORTERS[filter.sort])
}
