import { describe, expect, it } from 'vitest'
import { languageForPath } from './source-language'

describe('languageForPath', () => {
  it('maps TypeScript and JavaScript extensions', () => {
    expect(languageForPath('src/cart/thunks.ts')).toBe('typescript')
    expect(languageForPath('src/ui/ProductCard.tsx')).toBe('tsx')
    expect(languageForPath('scripts/build.mjs')).toBe('javascript')
  })

  it('falls back to plain text for unknown or missing extensions', () => {
    expect(languageForPath('LICENSE')).toBe('text')
    expect(languageForPath('data/blob.bin')).toBe('text')
  })
})
