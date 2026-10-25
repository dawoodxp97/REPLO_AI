import {
  BudgetExceededError,
  generateStructured,
  isRetryableProviderError,
  modelFor,
  specFor,
  type Budget,
  type Catalog,
  type LanguageModel,
  type ModelRole,
  type Registry,
  type RunContext,
} from '@replo/ai'
import type { ModelPlan, Stage } from '@replo/contracts'
import type { z } from 'zod'
import type { KeysService } from '../keys/keys.service'
import { JobError } from '../../jobs/errors'

const OUTPUT_ERRORS = new Set([
  'AI_NoObjectGeneratedError',
  'AI_TypeValidationError',
  'AI_JSONParseError',
])
interface LlmRequest<S extends z.ZodType> {
  stage: Stage
  system: string
  prompt: string
  schema: S
  maxOutputTokens: number
}

export interface LlmSession {
  hasRole(role: ModelRole): boolean
  call<S extends z.ZodType>(role: ModelRole, request: LlmRequest<S>): Promise<z.infer<S>>
}

export interface LlmDeps {
  catalog: Catalog
  keys: Pick<KeysService, 'openForJob'>
  resolve?: (run: RunContext, modelId: string) => LanguageModel
}

interface LlmJob {
  jobId: string
  userId: string
  keyId: string | null
  plan: ModelPlan
  budget: Budget
  signal: AbortSignal
}

export async function openLlm(deps: LlmDeps, job: LlmJob): Promise<LlmSession> {
  const opened = job.keyId ? await deps.keys.openForJob(job.userId, job.keyId) : undefined
  if (!opened) throw new JobError('KEY_REMOVED', false, 'the key for this job was removed')

  const run: RunContext = { provider: opened.provider, decryptedKey: opened.decryptedKey }
  const resolve = deps.resolve ?? modelFor
  const registry = registryFor(deps.catalog, job.plan)

  return {
    hasRole: (role) => registry[role].length > 0,

    async call(role, request) {
      if (registry[role].length === 0)
        throw new JobError('MODEL_UNAVAILABLE', false, `no model is planned for ${role}`)

      const attempt = (prompt: string) =>
        generateStructured({
          role,
          schema: request.schema,
          system: request.system,
          prompt,
          budget: job.budget,
          registry,
          resolveModel: (spec) => resolve(run, spec.id),
          meta: { jobId: job.jobId, stage: request.stage },
          maxOutputTokens: request.maxOutputTokens,
          signal: job.signal,
        })

      try {
        return await guarded(() => attempt(request.prompt))
      } catch (err) {
        if (!isOutputError(err)) throw err
        const reason = err instanceof Error ? err.message : 'output did not match the schema'
        try {
          return await guarded(() =>
            attempt(
              `${request.prompt}\n\nYour previous reply was rejected (${reason}). Reply again with one JSON object only.`,
            ),
          )
        } catch (retryErr) {
          if (!isOutputError(retryErr)) throw retryErr
          throw new JobError('LLM_OUTPUT_INVALID', false, 'model output failed validation twice')
        }
      }
    },
  }
}

function registryFor(catalog: Catalog, plan: ModelPlan): Registry {
  const spec = (id: string | null) => {
    if (id === null) return []
    const found = specFor(catalog, plan.provider, id)
    if (!found)
      throw new JobError('MODEL_UNAVAILABLE', false, `model ${id} is not priced in the catalogue`)
    return [found]
  }
  return {
    planner: spec(plan.models.planner),
    author: spec(plan.models.author),
    summarizer: spec(plan.models.summarizer),
    judge: spec(plan.models.judge),
  }
}

async function guarded<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (err) {
    if (err instanceof BudgetExceededError) throw err
    const status =
      typeof err === 'object' && err !== null && 'statusCode' in err ? err.statusCode : undefined
    if ((status === 401 || status === 403) && !isRetryableProviderError(err))
      throw new JobError('KEY_REJECTED', false, 'the provider rejected this key')
    throw err
  }
}

function isOutputError(err: unknown): boolean {
  return err instanceof Error && OUTPUT_ERRORS.has(err.name)
}
