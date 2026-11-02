import { describe, expect, it } from 'vitest'
import { formatLineRange, formatSourceRef, shortSha } from './source-ref-label'

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

describe('shortSha', () => {
  it('keeps the first seven characters', () => {
    expect(shortSha('3f9c1a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6')).toBe('3f9c1a2')
  })
})
