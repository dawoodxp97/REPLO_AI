import { describe, expect, it } from 'vitest'
import { importPath, sourceFromRepoParam } from './import-path'

describe('importPath', () => {
  it('links to the bare import page without a repository', () => {
    expect(importPath()).toBe('/import')
  })

  it('prefills public repositories only', () => {
    expect(importPath({ owner: 'acme', name: 'app', isPrivate: false })).toBe(
      '/import?repo=acme%2Fapp',
    )
    expect(importPath({ owner: 'acme', name: 'app', isPrivate: true })).toBe('/import')
  })
})

describe('sourceFromRepoParam', () => {
  it('builds a public url source from owner/name', () => {
    expect(sourceFromRepoParam('acme/app')).toEqual({
      kind: 'public_url',
      url: 'https://github.com/acme/app',
    })
  })

  it('rejects anything else', () => {
    expect(sourceFromRepoParam(undefined)).toBeUndefined()
    expect(sourceFromRepoParam('https://evil.example/x')).toBeUndefined()
    expect(sourceFromRepoParam('a/b/c')).toBeUndefined()
  })
})
