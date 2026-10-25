import { authed } from '../../orpc'

export const searchRouter = {
  own: authed.search.own.handler(({ input, context }) =>
    context.services.search.own(context.user.id, input),
  ),
}
