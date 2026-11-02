import type { DeleteAccountInput, MeDto, SignInMethodsDto } from '@replo/contracts'
import type { SessionUser } from '../../context'
import type { KeyVault } from '../../platform/crypto/key-vault'
import type { Db } from '../../platform/db/client'
import type { TutorialManager } from '../tutorials/manager.service'
import { openGithubToken } from './github-token'
import { identityRepo } from './identity.repo'

export interface IdentityService {
  deleteAccount(userId: string, input: DeleteAccountInput): Promise<void>
  githubAccessToken(userId: string): Promise<string | undefined>
  signInMethods(userId: string): Promise<SignInMethodsDto>
  meFor(user: SessionUser): Promise<MeDto>
}

interface IdentityDeps {
  db: Db
  vault: Pick<KeyVault, 'open'>
  tutorials: Pick<TutorialManager, 'settleOwnerDeletion'>
}

export function createIdentityService(deps: IdentityDeps): IdentityService {
  const { db, vault } = deps
  const signInMethods = async (userId: string): Promise<SignInMethodsDto> => {
    const providers = new Set(
      (await identityRepo(db).identitiesOf(userId)).map((identity) => identity.provider),
    )
    return {
      password: providers.has('password'),
      google: providers.has('google'),
      github: providers.has('github'),
    }
  }
  return {
    deleteAccount(userId, input) {
      return db.transaction(async (tx) => {
        await deps.tutorials.settleOwnerDeletion(tx, userId, input.publicTutorials)
        await identityRepo(tx).deleteUser(userId)
      })
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
