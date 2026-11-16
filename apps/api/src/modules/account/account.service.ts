import type { DeleteAccountInput } from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import type { IdentityService } from '../identity/identity.service'
import type { CourseManager } from '../courses/manager.service'

export interface AccountService {
  deleteAccount(userId: string, input: DeleteAccountInput): Promise<void>
}

export interface AccountDeps {
  db: Db
  identity: Pick<IdentityService, 'deleteUser'>
  courses: Pick<CourseManager, 'settleOwnerDeletion'>
}

export function createAccountService(deps: AccountDeps): AccountService {
  const { db, identity, courses } = deps
  return {
    deleteAccount(userId) {
      return db.transaction(async (tx) => {
        await courses.settleOwnerDeletion(tx, userId)
        await identity.deleteUser(tx, userId)
      })
    },
  }
}
