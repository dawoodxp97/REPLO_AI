import { authed } from '../../orpc'

export const meRouter = {
  get: authed.me.get.handler(async ({ context }) => ({
    user: context.user,
    signInMethods: await context.services.identity.signInMethods(context.user.id),
  })),
  deleteAccount: authed.me.deleteAccount.handler(async ({ input, context }) => {
    await context.services.identity.deleteAccount(context.user.id, input)
    return { ok: true as const }
  }),
}
