import { oc } from '@orpc/contract'
import { z } from 'zod'
import { OkResult } from './common'
import { MeDto } from './me'

export const AUTH_PROVIDERS = ['password', 'google', 'github'] as const
export const AuthProvider = z.enum(AUTH_PROVIDERS)
export type AuthProvider = z.infer<typeof AuthProvider>

export const OAUTH_PROVIDERS = ['google', 'github'] as const
export const OAuthProvider = z.enum(OAUTH_PROVIDERS)
export type OAuthProvider = z.infer<typeof OAuthProvider>

export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

const Email = z.string().trim().toLowerCase().pipe(z.email().max(254))

export const SignUpInput = z.object({
  name: z.string().trim().min(1).max(80),
  email: Email,
  password: z.string().min(PASSWORD_MIN_LENGTH).max(PASSWORD_MAX_LENGTH),
})
export type SignUpInput = z.infer<typeof SignUpInput>

export const SignInInput = z.object({
  email: Email,
  password: z.string().min(1).max(PASSWORD_MAX_LENGTH),
})
export type SignInInput = z.infer<typeof SignInInput>

export const EnabledProvidersDto = z.object({
  google: z.boolean(),
  github: z.boolean(),
})
export type EnabledProvidersDto = z.infer<typeof EnabledProvidersDto>

export const authContract = {
  providers: oc.route({ method: 'GET', path: '/auth/providers' }).output(EnabledProvidersDto),
  signUp: oc
    .route({ method: 'POST', path: '/auth/sign-up' })
    .input(SignUpInput)
    .output(MeDto)
    .errors({ EMAIL_TAKEN: {} }),
  signIn: oc
    .route({ method: 'POST', path: '/auth/sign-in' })
    .input(SignInInput)
    .output(MeDto)
    .errors({ INVALID_CREDENTIALS: {} }),
  signOut: oc.route({ method: 'POST', path: '/auth/sign-out' }).output(OkResult),
  revokeOtherSessions: oc
    .route({ method: 'POST', path: '/auth/revoke-other-sessions' })
    .output(OkResult),
}
