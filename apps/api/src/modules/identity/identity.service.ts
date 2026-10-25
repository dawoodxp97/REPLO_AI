import type { DeleteAccountInput } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import type { TutorialManager } from '../tutorials/manager.service'
import { identityRepo } from './identity.repo'

export interface LinkedAccount {
  id: string
  providerId: string
}

export interface LinkedAccounts {
  list(headers: Headers): Promise<readonly LinkedAccount[]>
  accessToken(accountId: string, headers: Headers): Promise<string | undefined>
}

export interface IdentityService {
  deleteAccount(userId: string, input: DeleteAccountInput): Promise<void>
  githubAccessToken(headers: Headers): Promise<string | undefined>
}

interface IdentityDeps {
  db: Pick<Db, 'transaction'>
  accounts: LinkedAccounts
  tutorials: Pick<TutorialManager, 'settleOwnerDeletion'>
}

export function createIdentityService(deps: IdentityDeps): IdentityService {
  return {
    deleteAccount(userId, input) {
      return deps.db.transaction(async (tx) => {
        await deps.tutorials.settleOwnerDeletion(tx, userId, input.publicTutorials)
        await identityRepo(tx).deleteUser(userId)
      })
    },

    async githubAccessToken(headers) {
      const github = (await deps.accounts.list(headers)).find(
        (account) => account.providerId === 'github',
      )
      return github ? await deps.accounts.accessToken(github.id, headers) : undefined
    },
  }
}
