import { randomUUID } from 'node:crypto'
import type {
  GenerationJobDto,
  ImportRepositoryInput,
  ModelPlan,
  PreflightResult,
  RerunRepositoryInput,
  RepositorySource,
} from '@replo/contracts'
import type { Db } from '../../platform/db/client'
import { notFound, requireFound } from '../../platform/errors'
import { ok, refused, type Outcome } from '../../platform/outcome'
import { toRepositoryMetadata } from '../github/github.events'
import type { JobService } from '../jobs/jobs.service'
import type { IndexingService } from '../indexing/indexing.service'
import type { KeysService } from '../keys/keys.service'
import type { ModelsService } from '../models/models.service'
import type { PlanRefusal } from './import-plan'
import type { Preflight, PreflightRefusal, ResolvedRepository } from './preflight'
import { repositoriesRepo } from './repositories.repo'

interface PlannedRun {
  plan: ModelPlan
  resolution: ResolvedRepository
}

export type { PlanRefusal }

export type ImportRefusal =
  PlanRefusal | { code: 'KEY_INVALID' } | { code: 'KEY_CHECK_UNAVAILABLE' }

export interface RepositoryImports {
  preflight(
    userId: string,
    source: RepositorySource,
  ): Promise<Outcome<PreflightResult, PreflightRefusal>>
  importRepository(
    userId: string,
    idempotencyKey: string,
    input: ImportRepositoryInput,
  ): Promise<Outcome<GenerationJobDto, ImportRefusal>>
  rerun(
    userId: string,
    input: RerunRepositoryInput,
  ): Promise<Outcome<GenerationJobDto, ImportRefusal>>
}

interface RepositoryImportsDeps {
  db: Db
  preflight: Preflight
  jobs: Pick<JobService, 'findByIdempotencyKey' | 'createJob' | 'toDto'>
  indexing: Pick<IndexingService, 'ensureSnapshot'>
  keys: Pick<KeysService, 'getOwned' | 'validate'>
  models: Pick<ModelsService, 'plan'>
  repositories: {
    findIngestSource(
      userId: string,
      repositoryId: string,
    ): Promise<{ owner: string; name: string; isPrivate: boolean; installationId: number | null } | undefined>
  }
}

export function createRepositoryImports(deps: RepositoryImportsDeps): RepositoryImports {
  const { db, preflight, jobs, indexing, keys, models, repositories } = deps

  const plan = async (
    userId: string,
    input: ImportRepositoryInput,
  ): Promise<Outcome<PlannedRun, PlanRefusal>> => {
    const key = requireFound(await keys.getOwned(userId, input.keyId), 'Key')
    const modelPlan = models.plan(key.provider, input.modelId)
    if (modelPlan === undefined)
      return refused({ code: 'MODEL_NOT_ALLOWED', modelId: input.modelId })

    const resolution = await preflight.resolve(userId, input.source)
    if (resolution.kind === 'refused') return resolution

    return ok({ plan: modelPlan, resolution: resolution.value })
  }

  const planFor = async (
    userId: string,
    keyId: string,
    modelId: string,
    source: RepositorySource,
  ): Promise<Outcome<PlannedRun, PlanRefusal>> =>
    plan(userId, { source, audience: 'intermediate', keyId, modelId })

  return {
    preflight: (userId, source) => preflight.run(userId, source),

    async importRepository(userId, idempotencyKey, input) {
      const existing = await jobs.findByIdempotencyKey(userId, idempotencyKey)
      if (existing) return ok(await jobs.toDto(existing))

      const outcome = await plan(userId, input)
      if (outcome.kind === 'refused') return outcome
      const verdict = await keys.validate(userId, input.keyId)
      if (verdict.kind === 'refused') return refused({ code: 'KEY_CHECK_UNAVAILABLE' })
      if (!verdict.value) return refused({ code: 'KEY_INVALID' })
      const run = outcome.value
      const { repo, installationId, commitSha } = run.resolution

      const { job } = await db.transaction(async (tx) => {
        const repos = repositoriesRepo(tx)
        const repositoryId = await repos.upsertRepository(toRepositoryMetadata(repo))
        await repos.linkUser(userId, repositoryId, installationId)
        const snapshotId = await indexing.ensureSnapshot(tx, { repositoryId, commitSha })
        return jobs.createJob(tx, {
          userId,
          snapshotId,
          idempotencyKey,
          audience: input.audience,
          providerKeyId: input.keyId,
          models: run.plan,
        })
      })
      return ok(await jobs.toDto(job))
    },

    async rerun(userId, input) {
      const source = await repositories.findIngestSource(userId, input.repositoryId)
      if (!source) notFound('Repository')

      const outcome = await planFor(userId, input.keyId, input.modelId, {
        kind: 'public_url',
        url: `https://github.com/${source.owner}/${source.name}`,
      })
      if (outcome.kind === 'refused') return outcome
      const verdict = await keys.validate(userId, input.keyId)
      if (verdict.kind === 'refused') return refused({ code: 'KEY_CHECK_UNAVAILABLE' })
      if (!verdict.value) return refused({ code: 'KEY_INVALID' })
      const run = outcome.value
      const { repo, installationId, commitSha } = run.resolution

      const { job } = await db.transaction(async (tx) => {
        const repos = repositoriesRepo(tx)
        const repositoryId = await repos.upsertRepository(toRepositoryMetadata(repo))
        await repos.linkUser(userId, repositoryId, installationId)
        const snapshotId = await indexing.ensureSnapshot(tx, { repositoryId, commitSha })
        return jobs.createJob(tx, {
          userId,
          snapshotId,
          idempotencyKey: randomUUID(),
          audience: 'intermediate',
          providerKeyId: input.keyId,
          models: run.plan,
        })
      })
      return ok(await jobs.toDto(job))
    },
  }
}
