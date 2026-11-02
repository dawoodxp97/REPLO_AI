import { describe, expect, it } from 'vitest'
import { decodeOffset, offsetPage } from './pagination'

describe('decodeOffset', () => {
  it('starts at zero without a cursor and reads a numeric cursor', () => {
    expect(decodeOffset(undefined)).toBe(0)
    expect(decodeOffset('40')).toBe(40)
  })
})

describe('offsetPage', () => {
  it('returns the window and the next offset when an extra row proves more exist', () => {
    expect(offsetPage([1, 2, 3], 10, 2)).toEqual({ items: [1, 2], nextCursor: '12' })
  })

  it('ends the listing when the page is not over-full', () => {
    expect(offsetPage([1, 2], 10, 2)).toEqual({ items: [1, 2], nextCursor: null })
    expect(offsetPage([], 0, 25)).toEqual({ items: [], nextCursor: null })
  })
})
