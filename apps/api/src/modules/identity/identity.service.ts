import type { MeDto, SignInMethodsDto } from '@replo/contracts'
import type { KeyVault } from '../../platform/crypto/key-vault'
import type { Db, Tx } from '../../platform/db/client'
import type { SessionUser } from './auth.types'
import { openGithubToken } from './github-token'
import { identityRepo } from './identity.repo'

export interface IdentityService {
  deleteUser(tx: Tx, userId: string): Promise<void>
  githubAccessToken(userId: string): Promise<string | undefined>
  signInMethods(userId: string): Promise<SignInMethodsDto>
  meFor(user: SessionUser): Promise<MeDto>
}

interface IdentityDeps {
  db: Db
  vault: Pick<KeyVault, 'open'>
}

export function createIdentityService(deps: IdentityDeps): IdentityService {
  const { db, vault } = deps
  const signInMethods = async (userId: string): Promise<SignInMethodsDto> => {
    const providers = new Set(await identityRepo(db).providersOf(userId))
    return {
      password: providers.has('password'),
      google: providers.has('google'),
      github: providers.has('github'),
    }
  }
  return {
    deleteUser(tx, userId) {
      return identityRepo(tx).deleteUser(userId)
    },

    async githubAccessToken(userId) {
      const identity = await identityRepo(db).identityFor(userId, 'github')
      return identity ? openGithubToken(vault, userId, identity) : undefined
    },

    signInMethods,

    async meFor(user) {
      return { user, signInMethods: await signInMethods(user.id) }
    },
  }
}
