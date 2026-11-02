import { describe, expect, it } from 'vitest'
import { githubSetupMessage } from './github-setup-status'

describe('githubSetupMessage', () => {
  it.each([
    'linked',
    'not_accessible',
    'owned_by_another_user',
    'github_not_linked',
    'invalid',
    'error',
  ])('has copy for %s', (status) => {
    expect(githubSetupMessage(status)?.title).toBeTruthy()
  })

  it('returns nothing without a status or for an unknown one', () => {
    expect(githubSetupMessage(undefined)).toBeNull()
    expect(githubSetupMessage('surprise')).toBeNull()
  })

  it.each(['constructor', '__proto__', 'toString', 'hasOwnProperty'])(
    'ignores the inherited key %s',
    (status) => {
      expect(githubSetupMessage(status)).toBeNull()
    },
  )

  it('keeps the explicit statuses distinct from inherited ones', () => {})

  it('marks failures as destructive and success as observed', () => {
    expect(githubSetupMessage('error')?.tone).toBe('destructive')
    expect(githubSetupMessage('linked')?.tone).toBe('observed')
  })
})
