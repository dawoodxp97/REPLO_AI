import { describe, expect, it } from 'vitest'
import { formatLineRange, formatSourceRef } from './source-refs'

describe('formatLineRange', () => {
  it('joins a range with an en dash', () => {
    expect(formatLineRange(18, 22)).toBe('L18–22')
  })

  it('collapses a single line', () => {
    expect(formatLineRange(7, 7)).toBe('L7')
  })
})

describe('formatSourceRef', () => {
  it('prefixes the path', () => {
    expect(formatSourceRef({ path: 'src/ui/ProductCard.tsx', startLine: 18, endLine: 22 })).toBe(
      'src/ui/ProductCard.tsx:L18–22',
    )
  })
})
