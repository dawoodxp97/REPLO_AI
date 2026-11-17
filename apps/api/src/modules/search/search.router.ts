import { authed } from '../../orpc'

export const searchRouter = {
  all: authed.search.all.handler(({ input, context }) =>
    context.services.search.all(context.user.id, input),
  ),
}
