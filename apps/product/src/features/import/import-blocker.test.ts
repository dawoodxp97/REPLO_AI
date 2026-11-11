import { describe, expect, it } from 'vitest'
import { importBlocker } from './import-blocker'

const KEY_ID = '0b8f7c1e-2d3a-4b5c-8d9e-0f1a2b3c4d5e'
const SOURCE = { kind: 'public_url', url: 'https://github.com/acme/widgets' }

describe('importBlocker', () => {
  it('asks for the repository before anything else', () => {
    expect(importBlocker({ keyId: KEY_ID })).toBe('Add the repository to teach first.')
  })

  it('asks for a key once the repository is set', () => {
    expect(importBlocker({ source: SOURCE })).toBe('Choose the key that pays for the run.')
  })

  it('names a bad budget', () => {
    expect(importBlocker({ source: SOURCE, keyId: KEY_ID, budgetUsd: -1 })).toBe(
      'Fix the budget ceiling.',
    )
  })

  it('is clear when the plan is complete', () => {
    expect(importBlocker({ source: SOURCE, keyId: KEY_ID })).toBeNull()
  })
})
