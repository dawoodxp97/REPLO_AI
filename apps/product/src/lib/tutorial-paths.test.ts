import { describe, expect, it } from 'vitest'
import { lessonPath, tutorialPath } from './tutorial-paths'

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
