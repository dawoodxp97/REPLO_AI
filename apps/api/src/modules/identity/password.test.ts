import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from './password'

describe('hashPassword', () => {
  it('stores a scrypt hash that verifies only with the original password', async () => {
    const stored = await hashPassword('correct horse battery')
    expect(stored.startsWith('scrypt$32768$8$1$')).toBe(true)
    expect(await verifyPassword('correct horse battery', stored)).toBe(true)
    expect(await verifyPassword('correct horse batterx', stored)).toBe(false)
  })

  it('salts every hash, so equal passwords store different values', async () => {
    expect(await hashPassword('same password')).not.toBe(await hashPassword('same password'))
  })

  it('answers false for a stored value that is not a well-formed hash', async () => {
    expect(await verifyPassword('anything', 'not-a-hash')).toBe(false)
    expect(await verifyPassword('anything', 'scrypt$32768$8$1$c2FsdA$aGFzaA')).toBe(false)
  })
})
