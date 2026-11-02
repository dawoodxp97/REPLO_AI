import type { EnabledProvidersDto } from '@replo/contracts'
import type { KeyVault } from '../../platform/crypto/key-vault'
import type { Db } from '../../platform/db/client'
import type { AuthService } from './auth.types'
import { createPasswordAuth } from './password-auth.service'
import { createProviderAuth } from './provider-auth.service'
import type { SessionService } from './session.service'

export type {
  AuthService,
  CurrentSession,
  IssuedSession,
  ProviderGrant,
  ProviderLink,
} from './auth.types'

export function createAuthService(deps: {
  db: Db
  vault: Pick<KeyVault, 'seal'>
  sessions: SessionService
  enabled: EnabledProvidersDto
}): AuthService {
  const { db, vault, sessions } = deps
  return {
    enabledProviders: () => deps.enabled,
    ...createPasswordAuth({ db, sessions }),
    ...createProviderAuth({ db, vault, sessions }),
    currentSession: sessions.currentSession,
    endSession: sessions.endSession,
    revokeOtherSessions: sessions.revokeOtherSessions,
  }
}
