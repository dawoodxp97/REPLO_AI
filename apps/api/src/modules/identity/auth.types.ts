import type { EnabledProvidersDto, OAuthProvider, SignInInput, SignUpInput } from '@replo/contracts'
import type { Outcome } from '../../platform/outcome'
import type { OAuthProfile } from './oauth'

export interface SessionUser {
  id: string
  name: string | null
  email: string | null
  image: string | null
}

export interface IssuedSession {
  token: string
  sessionId: string
  user: SessionUser
}

export interface CurrentSession {
  sessionId: string
  user: SessionUser
}

export interface ProviderGrant {
  provider: OAuthProvider
  profile: OAuthProfile
  accessToken: string
}

export interface ProviderLink extends ProviderGrant {
  userId: string
}

export interface PasswordAuth {
  signUp(input: SignUpInput): Promise<Outcome<IssuedSession, 'EMAIL_TAKEN'>>
  signIn(input: SignInInput): Promise<Outcome<IssuedSession, 'INVALID_CREDENTIALS'>>
}

export interface ProviderAuth {
  signInWithProvider(
    grant: ProviderGrant,
  ): Promise<Outcome<IssuedSession, 'ACCOUNT_EXISTS' | 'EMAIL_NOT_VERIFIED'>>
  linkProvider(
    link: ProviderLink,
  ): Promise<Outcome<true, 'IDENTITY_IN_USE' | 'PROVIDER_ALREADY_LINKED'>>
}

export interface SessionLifecycle {
  currentSession(token: string | undefined): Promise<CurrentSession | null>
  endSession(sessionId: string): Promise<void>
  revokeOtherSessions(userId: string, keepSessionId: string): Promise<void>
}

export interface AuthService extends PasswordAuth, ProviderAuth, SessionLifecycle {
  enabledProviders(): EnabledProvidersDto
}
