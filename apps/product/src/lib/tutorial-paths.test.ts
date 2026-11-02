import { describe, expect, it } from 'vitest'
import {
  createTutorialLinks,
  latestVersionNo,
  lessonPath,
  parseVersion,
  tutorialPath,
  withQuery,
  withTutorialContext,
} from './tutorial-paths'

const tutorial = { owner: 'acme', repo: 'widgets', slug: 'cart-flow' }

describe('tutorialPath', () => {
  it('builds the stable public URL', () => {
    expect(tutorialPath(tutorial)).toBe('/tutorials/acme/widgets/cart-flow')
  })

  it('encodes segments that are not plain URL characters', () => {
    expect(tutorialPath({ ...tutorial, slug: 'a b/c' })).toBe('/tutorials/acme/widgets/a%20b%2Fc')
  })
})

describe('lessonPath', () => {
  it('nests the chapter and lesson under the tutorial', () => {
    expect(lessonPath(tutorial, 'ch1', 'l2')).toBe('/tutorials/acme/widgets/cart-flow/learn/ch1/l2')
  })
})

describe('withQuery', () => {
  it('adds, replaces and drops parameters while keeping the rest', () => {
    expect(withQuery('/a?x=1&y=2', { y: '3', z: 4, x: undefined })).toBe('/a?y=3&z=4')
  })

  it('returns the bare path when nothing is left', () => {
    expect(withQuery('/a?x=1', { x: null })).toBe('/a')
  })
})

describe('withTutorialContext', () => {
  it('carries the version and the share token together', () => {
    expect(withTutorialContext('/a?path=x', { version: 2, shareToken: 'tok' })).toBe(
      '/a?path=x&version=2&share=tok',
    )
  })

  it('leaves the path alone without a version or token', () => {
    expect(withTutorialContext('/a', {})).toBe('/a')
  })
})

describe('createTutorialLinks overview', () => {
  it('is the bare tutorial path without options', () => {
    expect(createTutorialLinks(tutorial).overview()).toBe('/tutorials/acme/widgets/cart-flow')
  })

  it('carries both the version and the share token in one query string', () => {
    expect(createTutorialLinks(tutorial, { version: 2, shareToken: 'tok en' }).overview()).toBe(
      '/tutorials/acme/widgets/cart-flow?version=2&share=tok+en',
    )
  })

  it('keeps the share token when linking to a version', () => {
    expect(createTutorialLinks(tutorial, { version: 3, shareToken: 'abc' }).overview()).toContain(
      'share=abc',
    )
  })
})

describe('createTutorialLinks progress', () => {
  it('appends the share token to the progress path', () => {
    expect(createTutorialLinks(tutorial, { shareToken: 'abc' }).progress()).toBe(
      '/tutorials/acme/widgets/cart-flow/progress?share=abc',
    )
  })

  it('carries the version and the share token', () => {
    expect(createTutorialLinks(tutorial, { version: 1, shareToken: 'abc' }).progress()).toBe(
      '/tutorials/acme/widgets/cart-flow/progress?version=1&share=abc',
    )
  })

  it('stays clean without a token', () => {
    expect(createTutorialLinks(tutorial).progress()).toBe(
      '/tutorials/acme/widgets/cart-flow/progress',
    )
  })
})

describe('latestVersionNo', () => {
  it('picks the highest version number', () => {
    expect(latestVersionNo([{ versionNo: 1 }, { versionNo: 4 }, { versionNo: 2 }])).toBe(4)
  })

  it('is zero when there are no versions', () => {
    expect(latestVersionNo([])).toBe(0)
  })
})

describe('parseVersion', () => {
  it('accepts positive integers only', () => {
    expect(parseVersion('3')).toBe(3)
    expect(parseVersion('0')).toBeUndefined()
    expect(parseVersion('-1')).toBeUndefined()
    expect(parseVersion('1.5')).toBeUndefined()
    expect(parseVersion('abc')).toBeUndefined()
    expect(parseVersion(undefined)).toBeUndefined()
  })
})

describe('createTutorialLinks', () => {
  it('builds links without a share token', () => {
    const links = createTutorialLinks(tutorial, {})
    expect(links.overview()).toBe('/tutorials/acme/widgets/cart-flow')
    expect(links.lesson({ chapterKey: 'ch1', lessonKey: 'l2' })).toBe(
      '/tutorials/acme/widgets/cart-flow/learn/ch1/l2',
    )
    expect(links.sourceExplorer()).toBe('/tutorials/acme/widgets/cart-flow/code')
  })

  it('carries the share token on every link', () => {
    const links = createTutorialLinks(tutorial, { shareToken: 'tok' })
    expect(links.overview()).toBe('/tutorials/acme/widgets/cart-flow?share=tok')
    expect(links.lesson({ chapterKey: 'ch1', lessonKey: 'l2' })).toBe(
      '/tutorials/acme/widgets/cart-flow/learn/ch1/l2?share=tok',
    )
    expect(links.sourceExplorer()).toBe('/tutorials/acme/widgets/cart-flow/code?share=tok')
  })

  it('adds the selected file to the source explorer link', () => {
    const links = createTutorialLinks(tutorial, { shareToken: 'tok' })
    expect(links.sourceExplorer('src/cart/thunks.ts')).toBe(
      '/tutorials/acme/widgets/cart-flow/code?path=src%2Fcart%2Fthunks.ts&share=tok',
    )
  })

  it('carries the version before the share token on every link', () => {
    const links = createTutorialLinks(tutorial, { version: 1, shareToken: 'tok' })
    expect(links.overview()).toBe('/tutorials/acme/widgets/cart-flow?version=1&share=tok')
    expect(links.lesson({ chapterKey: 'ch1', lessonKey: 'l2' })).toBe(
      '/tutorials/acme/widgets/cart-flow/learn/ch1/l2?version=1&share=tok',
    )
    expect(links.sourceExplorer('a.ts')).toBe(
      '/tutorials/acme/widgets/cart-flow/code?path=a.ts&version=1&share=tok',
    )
  })
})
