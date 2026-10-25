import { authed } from '../../orpc'

export const settingsRouter = {
  get: authed.settings.get.handler(({ context }) => context.services.settings.get(context.user.id)),
  update: authed.settings.update.handler(({ input, context }) =>
    context.services.settings.update(context.user.id, input),
  ),
}
