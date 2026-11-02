import type { DeleteAccountInput } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import type { IdentityService } from '../identity/identity.service'
import type { TutorialManager } from '../tutorials/manager.service'

export interface AccountService {
  deleteAccount(userId: string, input: DeleteAccountInput): Promise<void>
}

export interface AccountDeps {
  db: Db
  identity: Pick<IdentityService, 'deleteUser'>
  tutorials: Pick<TutorialManager, 'settleOwnerDeletion'>
}

export function createAccountService(deps: AccountDeps): AccountService {
  const { db, identity, tutorials } = deps
  return {
    deleteAccount(userId, input) {
      return db.transaction(async (tx) => {
        await tutorials.settleOwnerDeletion(tx, userId, input.publicTutorials)
        await identity.deleteUser(tx, userId)
      })
    },
  }
}
