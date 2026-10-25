import { authed } from '../../orpc'

export const modelsRouter = {
  catalog: authed.models.catalog.handler(({ context }) => context.services.models.catalog()),
  getPreferences: authed.models.getPreferences.handler(({ context }) =>
    context.services.models.getPreferences(context.user.id),
  ),
  setPreferences: authed.models.setPreferences.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.models.setPreferences(context.user.id, input)
    if (outcome.kind === 'ok') return outcome.value
    throw errors.CUSTOM_MODEL_NOT_ALLOWED({ data: outcome.refusal })
  }),
}
