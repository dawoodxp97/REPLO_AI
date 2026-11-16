import { describe, expect, it } from 'vitest'
import {
  createCourseLinks,
  latestVersionNo,
  lessonPath,
  parseVersion,
  coursePath,
  withQuery,
  withCourseContext,
} from './course-paths'

const course = { owner: 'acme', repo: 'widgets', slug: 'cart-flow' }

describe('coursePath', () => {
  it('builds the stable course URL', () => {
    expect(coursePath(course)).toBe('/courses/acme/widgets/cart-flow')
  })

  it('encodes segments that are not plain URL characters', () => {
    expect(coursePath({ ...course, slug: 'a b/c' })).toBe('/courses/acme/widgets/a%20b%2Fc')
  })
})

describe('lessonPath', () => {
  it('nests the chapter and lesson under the course', () => {
    expect(lessonPath(course, 'ch1', 'l2')).toBe('/courses/acme/widgets/cart-flow/learn/ch1/l2')
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

describe('withCourseContext', () => {
  it('carries the version', () => {
    expect(withCourseContext('/a?path=x', { version: 2 })).toBe('/a?path=x&version=2')
  })

  it('leaves the path alone without a version', () => {
    expect(withCourseContext('/a', {})).toBe('/a')
  })
})

describe('createCourseLinks overview', () => {
  it('is the bare course path without options', () => {
    expect(createCourseLinks(course).overview()).toBe('/courses/acme/widgets/cart-flow')
  })

  it('carries the version in one query string', () => {
    expect(createCourseLinks(course, { version: 2 }).overview()).toBe(
      '/courses/acme/widgets/cart-flow?version=2',
    )
  })
})

describe('createCourseLinks progress', () => {
  it('carries the version', () => {
    expect(createCourseLinks(course, { version: 1 }).progress()).toBe(
      '/courses/acme/widgets/cart-flow/progress?version=1',
    )
  })

  it('stays clean without a version', () => {
    expect(createCourseLinks(course).progress()).toBe('/courses/acme/widgets/cart-flow/progress')
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

describe('createCourseLinks', () => {
  it('builds every link without options', () => {
    const links = createCourseLinks(course, {})
    expect(links.overview()).toBe('/courses/acme/widgets/cart-flow')
    expect(links.lesson({ chapterKey: 'ch1', lessonKey: 'l2' })).toBe(
      '/courses/acme/widgets/cart-flow/learn/ch1/l2',
    )
    expect(links.sourceExplorer()).toBe('/courses/acme/widgets/cart-flow/code')
  })

  it('adds the selected file to the source explorer link', () => {
    const links = createCourseLinks(course, {})
    expect(links.sourceExplorer('src/cart/thunks.ts')).toBe(
      '/courses/acme/widgets/cart-flow/code?path=src%2Fcart%2Fthunks.ts',
    )
  })

  it('carries the version on every link', () => {
    const links = createCourseLinks(course, { version: 1 })
    expect(links.overview()).toBe('/courses/acme/widgets/cart-flow?version=1')
    expect(links.lesson({ chapterKey: 'ch1', lessonKey: 'l2' })).toBe(
      '/courses/acme/widgets/cart-flow/learn/ch1/l2?version=1',
    )
    expect(links.sourceExplorer('a.ts')).toBe(
      '/courses/acme/widgets/cart-flow/code?path=a.ts&version=1',
    )
  })
})
