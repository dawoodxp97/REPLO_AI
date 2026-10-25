import type { ORPCErrorConstructorMap } from '@orpc/server'
import type { planRefusalErrors, repoRefusalErrors } from '@replo/contracts'
import { authed } from '../../orpc'
import type { PreflightRefusal } from './preflight'
import type { PlanRefusal } from './imports.service'

type RepoErrors = ORPCErrorConstructorMap<typeof repoRefusalErrors>
type PlanErrors = ORPCErrorConstructorMap<typeof planRefusalErrors>

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

const raisePlanRefusal = (errors: PlanErrors, refusal: PlanRefusal): never => {
  switch (refusal.code) {
    case 'FREE_PRESET_REQUIRES_OPENROUTER':
      throw errors.FREE_PRESET_REQUIRES_OPENROUTER()
    case 'PRESET_UNAVAILABLE':
      throw errors.PRESET_UNAVAILABLE({ data: { reason: refusal.reason } })
    case 'CUSTOM_MODEL_NOT_ALLOWED':
      throw errors.CUSTOM_MODEL_NOT_ALLOWED({
        data: { role: refusal.role, modelId: refusal.modelId },
      })
    case 'BUDGET_BELOW_ESTIMATE':
      throw errors.BUDGET_BELOW_ESTIMATE({
        data: { estimateUsd: refusal.estimateUsd, budgetUsd: refusal.budgetUsd },
      })
    default:
      return raiseRepoRefusal(errors, refusal)
  }
}

export const repositoriesRouter = {
  list: authed.repositories.list.handler(({ input, context }) =>
    context.services.repositoryLibrary.list(context.user.id, input),
  ),
  remove: authed.repositories.remove.handler(async ({ input, context }) => {
    await context.services.repositoryLibrary.remove(context.user.id, input.repositoryId)
    return { ok: true as const }
  }),
  preflight: authed.repositories.preflight.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.repositoryImports.preflight(
      context.user.id,
      input.source,
    )
    return outcome.kind === 'ok' ? outcome.value : raiseRepoRefusal(errors, outcome.refusal)
  }),
  estimate: authed.repositories.estimate.handler(async ({ input, context, errors }) => {
    const outcome = await context.services.repositoryImports.estimate(context.user.id, input)
    return outcome.kind === 'ok' ? outcome.value : raisePlanRefusal(errors, outcome.refusal)
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
      default:
        return raisePlanRefusal(errors, refusal)
    }
  }),
}
