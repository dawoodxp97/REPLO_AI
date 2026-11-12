import type { TutorialSummaryDto } from '@replo/contracts'
import { describe, expect, it } from 'vitest'
import { applyLibraryFilter, DEFAULT_LIBRARY_FILTER, isFiltering } from './library-filter'

function tutorial(overrides: Partial<TutorialSummaryDto>): TutorialSummaryDto {
  return {
    id: '00000000-0000-4000-8000-000000000000',
    slug: 'tour',
    title: 'Tour',
    owner: 'acme',
    repo: 'widgets',
    visibility: 'private',
    audience: 'intermediate',
    currentVersionNo: 1,
    updatedAt: '2026-10-01T00:00:00.000Z',
    progress: null,
    ...overrides,
  }
}

const cart = tutorial({ title: 'How the cart works', visibility: 'public', progress: 1 })
const auth = tutorial({
  title: 'Auth flow',
  repo: 'gateway',
  visibility: 'link',
  progress: 0.4,
  updatedAt: '2026-11-01T00:00:00.000Z',
})
const build = tutorial({ title: 'Build pipeline', updatedAt: '2026-10-15T00:00:00.000Z' })
const ALL = [cart, auth, build]

const titles = (rows: readonly TutorialSummaryDto[]) => rows.map((row) => row.title)

describe('applyLibraryFilter', () => {
  it('lists everything, newest first, by default', () => {
    expect(titles(applyLibraryFilter(ALL, DEFAULT_LIBRARY_FILTER))).toEqual([
      'Auth flow',
      'Build pipeline',
      'How the cart works',
    ])
  })

  it('matches the query against the title and the repository, ignoring case', () => {
    expect(titles(applyLibraryFilter(ALL, { ...DEFAULT_LIBRARY_FILTER, query: ' CART ' }))).toEqual(
      ['How the cart works'],
    )
    expect(
      titles(applyLibraryFilter(ALL, { ...DEFAULT_LIBRARY_FILTER, query: 'acme/gateway' })),
    ).toEqual(['Auth flow'])
  })

  it('keeps one visibility and can hide finished tutorials', () => {
    expect(
      titles(applyLibraryFilter(ALL, { ...DEFAULT_LIBRARY_FILTER, visibility: 'link' })),
    ).toEqual(['Auth flow'])
    expect(
      titles(applyLibraryFilter(ALL, { ...DEFAULT_LIBRARY_FILTER, hideFinished: true })),
    ).toEqual(['Auth flow', 'Build pipeline'])
  })

  it('sorts by title or by how much has been read, unread last', () => {
    expect(titles(applyLibraryFilter(ALL, { ...DEFAULT_LIBRARY_FILTER, sort: 'title' }))).toEqual([
      'Auth flow',
      'Build pipeline',
      'How the cart works',
    ])
    expect(
      titles(applyLibraryFilter(ALL, { ...DEFAULT_LIBRARY_FILTER, sort: 'progress' })),
    ).toEqual(['How the cart works', 'Auth flow', 'Build pipeline'])
  })

  it('does not reorder the list it was given', () => {
    applyLibraryFilter(ALL, { ...DEFAULT_LIBRARY_FILTER, sort: 'title' })
    expect(titles(ALL)).toEqual(['How the cart works', 'Auth flow', 'Build pipeline'])
  })
})

describe('isFiltering', () => {
  it('is false for the default view and for a different sort order', () => {
    expect(isFiltering(DEFAULT_LIBRARY_FILTER)).toBe(false)
    expect(isFiltering({ ...DEFAULT_LIBRARY_FILTER, sort: 'title' })).toBe(false)
  })

  it('is true once anything narrows the list', () => {
    expect(isFiltering({ ...DEFAULT_LIBRARY_FILTER, query: 'x' })).toBe(true)
    expect(isFiltering({ ...DEFAULT_LIBRARY_FILTER, hideFinished: true })).toBe(true)
  })
})
