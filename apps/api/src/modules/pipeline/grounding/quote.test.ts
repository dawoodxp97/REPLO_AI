import { describe, expect, it } from 'vitest'
import { locateQuote } from './quote'

const lines = ['const a = 1', '  items.push(item)', '', 'return   saveCart(items)']

describe('locateQuote', () => {
  it('finds a single-line quote and returns its line', () => {
    expect(locateQuote(lines, 'items.push(item)', { startLine: 1, endLine: 4 })).toEqual({
      startLine: 2,
      endLine: 2,
    })
  })

  it('ignores indentation and repeated whitespace', () => {
    expect(locateQuote(lines, 'return saveCart(items)', { startLine: 1, endLine: 4 })).toEqual({
      startLine: 4,
      endLine: 4,
    })
  })

  it('finds a quote that spans two lines', () => {
    expect(
      locateQuote(['const total =', '  price * count', 'done'], 'const total = price * count', {
        startLine: 1,
        endLine: 3,
      }),
    ).toEqual({ startLine: 1, endLine: 2 })
  })

  it('searches only inside the given range', () => {
    expect(locateQuote(lines, 'items.push(item)', { startLine: 3, endLine: 4 })).toBeUndefined()
  })

  it('rejects quotes too short to be evidence', () => {
    expect(locateQuote(lines, 'const', { startLine: 1, endLine: 4 })).toBeUndefined()
  })

  it('returns undefined when the text is not in the file', () => {
    expect(locateQuote(lines, 'deleteEverything()', { startLine: 1, endLine: 4 })).toBeUndefined()
  })
})
