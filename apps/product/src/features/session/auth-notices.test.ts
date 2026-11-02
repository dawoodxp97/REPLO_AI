import { describe, expect, it } from 'vitest'
import { authNotice } from './auth-notices'

describe('authNotice', () => {
  it('returns the copy for a known code', () => {
    expect(authNotice('OAUTH_DENIED')).toContain('cancelled')
  })

  it('returns nothing for a missing or unknown code', () => {
    expect(authNotice(undefined)).toBeNull()
    expect(authNotice('SURPRISE')).toBeNull()
  })

  it.each(['__proto__', 'constructor', 'toString', 'hasOwnProperty'])(
    'ignores the inherited key %s',
    (code) => {
      expect(authNotice(code)).toBeNull()
    },
  )
})
