import type { RequestContext } from '../../context'
import { authed, os } from '../../orpc'
import type { IssuedSession } from './auth.service'

const signedInMe = async (context: RequestContext, issued: IssuedSession) => {
  context.setSessionToken(issued.token)
  return {
    user: issued.user,
    signInMethods: await context.services.identity.signInMethods(issued.user.id),
  }
}

export const authRouter = {
  providers: os.auth.providers.handler(({ context }) => context.services.auth.enabledProviders()),

  signUp: os.auth.signUp.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.auth.signUp(input)
    if (outcome.kind === 'refused') throw errors.EMAIL_TAKEN()
    return signedInMe(context, outcome.value)
  }),

  signIn: os.auth.signIn.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.auth.signIn(input)
    if (outcome.kind === 'refused') throw errors.INVALID_CREDENTIALS()
    return signedInMe(context, outcome.value)
  }),

  signOut: os.auth.signOut.handler(async ({ context }) => {
    if (context.sessionId) await context.services.auth.endSession(context.sessionId)
    context.setSessionToken(null)
    return { ok: true as const }
  }),

  revokeOtherSessions: authed.auth.revokeOtherSessions.handler(async ({ context }) => {
    await context.services.auth.revokeOtherSessions(context.user.id, context.sessionId)
    return { ok: true as const }
  }),
}
