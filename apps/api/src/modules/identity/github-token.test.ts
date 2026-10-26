import { randomBytes } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { KeyVault } from '../../platform/crypto/key-vault'
import { openGithubToken, sealGithubToken } from './github-token'
import type { IdentityRow } from './identity.repo'

const vault = KeyVault.fromEnv(randomBytes(32).toString('base64'), 1)

const identityWith = (userId: string, columns: Partial<IdentityRow> = {}): IdentityRow => ({
  id: '0190f6a2-7c1e-7d4a-8f3b-2a9c4e5d6f70',
  userId,
  provider: 'github',
  providerAccountId: '42',
  passwordHash: null,
  accessTokenCiphertext: null,
  accessTokenIv: null,
  accessTokenKeyVersion: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...columns,
})

describe('GitHub token sealing', () => {
  it('opens the token it sealed for the same user', () => {
    const sealed = sealGithubToken(vault, 'user-1', 'gho_secret_value')
    expect(sealed.accessTokenCiphertext).not.toContain('gho_secret_value')
    expect(openGithubToken(vault, 'user-1', identityWith('user-1', sealed))).toBe(
      'gho_secret_value',
    )
  })

  it('refuses to open the token for a different user', () => {
    const sealed = sealGithubToken(vault, 'user-1', 'gho_secret_value')
    expect(() => openGithubToken(vault, 'user-2', identityWith('user-2', sealed))).toThrow()
  })

  it('reports no token when the identity stores none', () => {
    expect(openGithubToken(vault, 'user-1', identityWith('user-1'))).toBeUndefined()
  })
})
