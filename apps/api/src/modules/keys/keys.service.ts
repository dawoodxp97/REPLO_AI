import type { AddKeyInput, KeyDto, Provider } from '@replo/contracts'
import { keyAad, type KeyVault } from '../../platform/crypto/key-vault'
import type { Db, Tx } from '../../platform/db/client'
import { notFound } from '../../platform/errors'
import { ok, refused, type Outcome } from '../../platform/outcome'
import type { KeyChecker } from '@replo/ai'
import { keysRepo, type ProviderKeyRow } from './keys.repo'

interface OwnedKey {
  id: string
  provider: Provider
}

interface DecryptedKey {
  provider: Provider
  decryptedKey: string
}

export interface KeyJobs {
  failForKey(tx: Tx, keyId: string): Promise<void>
}

interface KeyCheckUnavailable {
  code: 'KEY_CHECK_UNAVAILABLE'
}

interface AddKeyRefusal {
  code: 'KEY_INVALID' | 'KEY_ALREADY_EXISTS' | 'KEY_CHECK_UNAVAILABLE'
}

export interface KeysService {
  list(userId: string): Promise<KeyDto[]>
  add(userId: string, input: AddKeyInput): Promise<Outcome<KeyDto, AddKeyRefusal>>
  validate(userId: string, keyId: string): Promise<Outcome<boolean, KeyCheckUnavailable>>
  delete(userId: string, keyId: string): Promise<void>
  getOwned(userId: string, keyId: string): Promise<OwnedKey | undefined>
  openForJob(userId: string, keyId: string): Promise<DecryptedKey | undefined>
}

interface KeysDeps {
  db: Db
  vault: KeyVault
  checker: KeyChecker
  jobs: KeyJobs
}

const toDto = (
  row: Pick<
    ProviderKeyRow,
    'id' | 'provider' | 'label' | 'last4' | 'lastValidatedAt' | 'createdAt'
  >,
): KeyDto => ({
  id: row.id,
  provider: row.provider,
  label: row.label,
  last4: row.last4,
  lastValidatedAt: row.lastValidatedAt?.toISOString() ?? null,
  createdAt: row.createdAt.toISOString(),
})

export function createKeysService(deps: KeysDeps): KeysService {
  const { db, vault, checker, jobs } = deps

  const open = (row: ProviderKeyRow) => vault.open(row, keyAad(row.userId, row.provider))

  return {
    async list(userId) {
      return (await keysRepo(db).list(userId)).map(toDto)
    },

    async add(userId, input) {
      const repo = keysRepo(db)
      if (await repo.findByLabel(userId, input.provider, input.label))
        return refused({ code: 'KEY_ALREADY_EXISTS' })

      const check = await checker.check(input.provider, input.apiKey)
      if (check === 'invalid') return refused({ code: 'KEY_INVALID' })
      if (check === 'unavailable') return refused({ code: 'KEY_CHECK_UNAVAILABLE' })

      const sealed = vault.seal(input.apiKey, keyAad(userId, input.provider))
      const row = await repo.insert({
        userId,
        provider: input.provider,
        label: input.label,
        ciphertext: sealed.ciphertext,
        iv: sealed.iv,
        keyVersion: sealed.keyVersion,
        last4: sealed.last4,
        lastValidatedAt: new Date(),
      })
      if (!row) return refused({ code: 'KEY_ALREADY_EXISTS' })
      return ok(toDto(row))
    },

    async validate(userId, keyId) {
      const row = await keysRepo(db).findOwned(userId, keyId)
      if (!row) notFound('Key')
      const check = await checker.check(row.provider, open(row))
      if (check === 'unavailable') return refused({ code: 'KEY_CHECK_UNAVAILABLE' })
      if (check === 'valid') await keysRepo(db).markValidated(row.id, new Date())
      return ok(check === 'valid')
    },

    async delete(userId, keyId) {
      await db.transaction(async (tx) => {
        const row = await keysRepo(tx).findOwned(userId, keyId)
        if (!row) notFound('Key')
        await jobs.failForKey(tx, row.id)
        await keysRepo(tx).delete(row.id)
      })
    },

    async getOwned(userId, keyId) {
      const row = await keysRepo(db).findOwned(userId, keyId)
      return row ? { id: row.id, provider: row.provider } : undefined
    },

    async openForJob(userId, keyId) {
      const row = await keysRepo(db).findOwned(userId, keyId)
      return row ? { provider: row.provider, decryptedKey: open(row) } : undefined
    },
  }
}
