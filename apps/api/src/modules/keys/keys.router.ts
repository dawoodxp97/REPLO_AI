import { authed } from '../../orpc'

export const keysRouter = {
  list: authed.keys.list.handler(({ context }) => context.services.keys.list(context.user.id)),
  add: authed.keys.add.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.keys.add(context.user.id, input)
    if (outcome.kind === 'ok') return outcome.value
    throw errors[outcome.refusal.code]()
  }),
  validate: authed.keys.validate.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.keys.validate(context.user.id, input.keyId)
    if (outcome.kind === 'refused') throw errors.KEY_CHECK_UNAVAILABLE()
    return { valid: outcome.value }
  }),
  delete: authed.keys.delete.handler(async ({ input, context }) => {
    await context.services.keys.delete(context.user.id, input.keyId)
    return { ok: true as const }
  }),
}
