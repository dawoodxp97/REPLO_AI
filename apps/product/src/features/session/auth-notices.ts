import { apiErrorDetails } from '@/lib/api-error'

const NOTICES: Record<string, string> = {
  OAUTH_DENIED: 'Sign-in was cancelled at the provider. Try again when you are ready.',
  OAUTH_STATE: 'That sign-in link has expired. Start again from this page.',
  OAUTH_FAILED: 'The provider could not confirm your account. Try again.',
  OAUTH_NOT_CONFIGURED:
    'That sign-in provider is not set up on this server yet. Use email and password, or ask the operator to add OAuth credentials.',
  EMAIL_NOT_VERIFIED: 'The provider has not verified that email address, so Replo cannot use it.',
  ACCOUNT_EXISTS:
    'An account already uses this email. Sign in with your password, then connect the provider in Settings.',
  IDENTITY_IN_USE: 'That account is already connected to a different Replo account.',
  PROVIDER_ALREADY_LINKED:
    'This Replo account already has a different account connected for that provider.',
}

export function authNotice(code: string | undefined): string | null {
  return code ? (NOTICES[code] ?? null) : null
}

export function describeAuthError(error: unknown): string {
  switch (apiErrorDetails(error)?.code) {
    case 'EMAIL_TAKEN':
      return 'An account with this email already exists. Sign in instead.'
    case 'INVALID_CREDENTIALS':
      return 'That email and password do not match an account.'
    default:
      return 'Something went wrong. Try again.'
  }
}
