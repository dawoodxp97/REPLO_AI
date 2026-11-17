import type { ORPCErrorConstructorMap } from '@orpc/server'
import { OK_RESULT, type repoRefusalErrors } from '@replo/contracts'
import { authed } from '../../orpc'
import type { PreflightRefusal } from './preflight'

type RepoErrors = ORPCErrorConstructorMap<typeof repoRefusalErrors>

const raiseRepoRefusal = (errors: RepoErrors, refusal: PreflightRefusal): never => {
  switch (refusal.code) {
    case 'REPO_NOT_ACCESSIBLE':
      throw errors.REPO_NOT_ACCESSIBLE()
    case 'REPO_TOO_LARGE':
      throw errors.REPO_TOO_LARGE({ data: refusal.data })
    case 'UNSUPPORTED_LANGUAGE':
      throw errors.UNSUPPORTED_LANGUAGE()
  }
}

export const repositoriesRouter = {
  list: authed.repositories.list.handler(({ input, context }) =>
    context.services.repositoryLibrary.list(context.user.id, input),
  ),
  remove: authed.repositories.remove.handler(async ({ input, context }) => {
    await context.services.repositoryLibrary.remove(context.user.id, input.repositoryId)
    return OK_RESULT
  }),
  preflight: authed.repositories.preflight.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.repositoryImports.preflight(
      context.user.id,
      input.source,
    )
    return outcome.kind === 'ok' ? outcome.value : raiseRepoRefusal(errors, outcome.refusal)
  }),
  import: authed.repositories.import.handler(async ({ input, context, errors }) => {
    const { idempotencyKey } = context
    if (idempotencyKey === undefined) throw errors.IDEMPOTENCY_KEY_REQUIRED()
    const outcome = await context.services.repositoryImports.importRepository(
      context.user.id,
      idempotencyKey,
      input,
    )
    if (outcome.kind === 'ok') return outcome.value
    const refusal = outcome.refusal
    switch (refusal.code) {
      case 'KEY_INVALID':
        throw errors.KEY_INVALID()
      case 'KEY_CHECK_UNAVAILABLE':
        throw errors.KEY_CHECK_UNAVAILABLE()
      case 'MODEL_NOT_ALLOWED':
        throw errors.MODEL_NOT_ALLOWED({ data: { modelId: refusal.modelId } })
      default:
        return raiseRepoRefusal(errors, refusal)
    }
  }),
  rerun: authed.repositories.rerun.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.repositoryImports.rerun(context.user.id, input)
    if (outcome.kind === 'ok') return outcome.value
    const refusal = outcome.refusal
    switch (refusal.code) {
      case 'KEY_INVALID':
        throw errors.KEY_INVALID()
      case 'KEY_CHECK_UNAVAILABLE':
        throw errors.KEY_CHECK_UNAVAILABLE()
      case 'MODEL_NOT_ALLOWED':
        throw errors.MODEL_NOT_ALLOWED({ data: { modelId: refusal.modelId } })
      default:
        return raiseRepoRefusal(errors, refusal)
    }
  }),
}
