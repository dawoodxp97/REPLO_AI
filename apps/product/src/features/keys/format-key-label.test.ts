import { describe, expect, it } from 'vitest'
import { keyMask, keyOptionLabel, keyTitle } from './format-key-label'

describe('key labels', () => {
  const openrouter = { provider: 'openrouter', label: 'work', last4: 'a1b2' } as const
  const anthropic = { provider: 'anthropic', label: 'personal', last4: '9z9z' } as const

  it('formats the title and the mask', () => {
    expect(keyTitle(openrouter)).toBe('OpenRouter · work')
    expect(keyMask(openrouter)).toBe('…a1b2')
  })

  it('marks only the recommended provider in option labels', () => {
    expect(keyOptionLabel(openrouter)).toBe('OpenRouter (recommended) · work · …a1b2')
    expect(keyOptionLabel(anthropic)).toBe('Anthropic · personal · …9z9z')
  })
})
