import { createAuthClient } from 'better-auth/react'
import { env } from './env'

const authClient = createAuthClient({ baseURL: env.apiUrl })

export const signInWithGithub = () =>
  authClient.signIn.social({ provider: 'github', callbackURL: env.appUrl })

export const signOut = () => authClient.signOut()

export const revokeOtherSessions = () => authClient.revokeOtherSessions()
