import { describe, expect, it } from 'vitest'
import { codeIdentifiers, sanitizeMarkdown, unknownIdentifiers } from './markdown'

describe('sanitizeMarkdown', () => {
  it('strips raw HTML, images and javascript links', () => {
    expect(sanitizeMarkdown('Hello <img src=x onerror=alert(1)> world')).toBe('Hello  world')
    expect(sanitizeMarkdown('see ![logo](https://evil.example/x.png)')).toBe('see')
    expect(sanitizeMarkdown('[click](javascript:alert(1))')).toBe('click')
  })

  it('keeps link text and drops the target', () => {
    expect(sanitizeMarkdown('read [the docs](https://example.com/docs)')).toBe('read the docs')
  })

  it('drops bare URLs and reference-link definitions', () => {
    expect(sanitizeMarkdown('visit https://evil.example/login now')).toBe('visit now')
    expect(sanitizeMarkdown('read [docs]\n\n[docs]: https://evil.example/x')).toBe('read [docs]')
  })
})

describe('codeIdentifiers', () => {
  it('returns every identifier inside code spans and ignores the prose around them', () => {
    expect(codeIdentifiers('Call `addToCart()` then `npm install` and `cart.items`')).toEqual([
      'addToCart',
      'npm',
      'install',
      'cart.items',
    ])
  })

  it('splits a span with arguments into its identifiers', () => {
    expect(codeIdentifiers('Calls `makeThing(item)` here')).toEqual(['makeThing', 'item'])
  })
})

describe('unknownIdentifiers', () => {
  it('flags identifiers the repository never uses', () => {
    const known = new Set(['addToCart', 'cart', 'items'])
    expect(
      unknownIdentifiers(['`addToCart` and `cart.items` and `invented.thing`'], known),
    ).toEqual(['invented.thing'])
  })
})
