import { describe, expect, it } from 'vitest'
import { breadcrumbsFor } from './breadcrumbs'
import { PRIMARY_NAV } from './nav-items'

describe('breadcrumbsFor', () => {
  it('shows nothing on top-level pages', () => {
    for (const path of ['/', '/library', '/repositories', '/import']) {
      expect(breadcrumbsFor(path)).toBeNull()
    }
  })

  it('places a settings section under Settings', () => {
    expect(breadcrumbsFor('/settings/keys')).toEqual([
      { label: 'Settings', href: '/settings/profile' },
      { label: 'API keys' },
    ])
  })

  it('ignores an unknown settings section', () => {
    expect(breadcrumbsFor('/settings/nope')).toBeNull()
  })

  it('files a generation job under Library', () => {
    expect(breadcrumbsFor('/jobs/7d2e9c10-5a1b-4f6e-8c3d-9a0b1c2d3e4f')).toEqual([
      { label: 'Library', href: '/library' },
      { label: 'Generation' },
    ])
  })
})

describe('primary navigation', () => {
  const activeFor = (path: string) =>
    PRIMARY_NAV.filter((item) => item.isActive(path)).map((item) => item.label)

  it('marks Library while a job runs', () => {
    expect(activeFor('/jobs/abc')).toEqual(['Library'])
  })

  it('keeps Repositories for its own page only', () => {
    expect(activeFor('/repositories')).toEqual(['Repositories'])
  })
})
