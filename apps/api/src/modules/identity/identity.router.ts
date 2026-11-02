import { OK_RESULT } from '@replo/contracts'
import { authed } from '../../orpc'

export const meRouter = {
  get: authed.me.get.handler(({ context }) => context.services.identity.meFor(context.user)),
  deleteAccount: authed.me.deleteAccount.handler(async ({ input, context }) => {
    await context.services.identity.deleteAccount(context.user.id, input)
    return OK_RESULT
  }),
}
