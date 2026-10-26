import type { KeyVault } from '../../platform/crypto/key-vault'
import type { IdentityRow, SealedTokenColumns } from './identity.repo'

const associatedData = (userId: string) => `github-token:${userId}`

export function sealGithubToken(
  vault: Pick<KeyVault, 'seal'>,
  userId: string,
  accessToken: string,
): SealedTokenColumns {
  const sealed = vault.seal(accessToken, associatedData(userId))
  return {
    accessTokenCiphertext: sealed.ciphertext,
    accessTokenIv: sealed.iv,
    accessTokenKeyVersion: sealed.keyVersion,
  }
}

export function openGithubToken(
  vault: Pick<KeyVault, 'open'>,
  userId: string,
  identity: IdentityRow,
): string | undefined {
  if (
    !identity.accessTokenCiphertext ||
    !identity.accessTokenIv ||
    identity.accessTokenKeyVersion === null
  )
    return undefined
  return vault.open(
    {
      ciphertext: identity.accessTokenCiphertext,
      iv: identity.accessTokenIv,
      keyVersion: identity.accessTokenKeyVersion,
    },
    associatedData(userId),
  )
}
