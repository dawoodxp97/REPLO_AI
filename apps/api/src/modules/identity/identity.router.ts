import { authed } from '../../orpc'

export const meRouter = {
  get: authed.me.get.handler(({ context }) => ({ user: context.user })),
  deleteAccount: authed.me.deleteAccount.handler(async ({ input, context }) => {
    await context.services.identity.deleteAccount(context.user.id, input)
    return { ok: true as const }
  }),
}
