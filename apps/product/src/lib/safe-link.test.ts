import { describe, expect, it } from 'vitest'
import { isAllowedLink } from './safe-link'

const SHA = '3f9c1a2b7d4e8f0a1b2c3d4e5f60718293a4b5c6'

describe('isAllowedLink', () => {
  it('allows a GitHub permalink pinned to a commit', () => {
    expect(isAllowedLink(`https://github.com/acme/widgets/blob/${SHA}/src/cart.ts#L9-L27`)).toBe(
      true,
    )
  })

  it('refuses a GitHub link that is not pinned to a commit', () => {
    expect(isAllowedLink('https://github.com/acme/widgets/blob/main/src/cart.ts')).toBe(false)
  })

  it('refuses a GitHub page that is not a repository file', () => {
    expect(isAllowedLink('https://github.com/acme/widgets/issues/1')).toBe(false)
  })

  it('allows the OpenRouter host', () => {
    expect(isAllowedLink('https://openrouter.ai/keys')).toBe(true)
  })

  it('refuses plain HTTP, other hosts and unparseable values', () => {
    expect(isAllowedLink('http://openrouter.ai/keys')).toBe(false)
    expect(isAllowedLink('https://example.com/keys')).toBe(false)
    expect(isAllowedLink('javascript:alert(1)')).toBe(false)
    expect(isAllowedLink(undefined)).toBe(false)
  })
})
