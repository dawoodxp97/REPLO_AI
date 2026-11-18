import type { GraphLayer } from '@replo/contracts'
import type { StageContext } from '../../../worker/generate-course'
import type { FileEnrichment } from '../enrichment'
import { rankedFiles } from '../graph'
import { promptFor, dataSection } from '../prompts'
import { dataFiles } from '../prompt-inputs'
import { EnrichDraft, FlowsDraft } from '../drafts'
import type { SourceIndex } from '../grounding/source-index'
import {
  enrichBatchKey,
  FLOWS_CHECKPOINT,
  StoredEnrichment,
  type StoredFlows,
  WHOLE_JOB,
} from '../checkpoints'
import { checkpointed, openSession, planOf, sourceWorkspace, type StageDeps } from '../stage-tools'

const ENRICH_FILES = 60
const ENRICH_BATCH = 8
export const LITE_MAX_FILES = 300

export async function runEnrich(deps: StageDeps, ctx: StageContext): Promise<void> {
  const { view, index } = await sourceWorkspace(deps, ctx)
  const lite = planOf(ctx).pipeline === 'lite' || view.files.length <= LITE_MAX_FILES

  let stored = await deps.checkpoints.read(ctx.job.id, 'enrich', WHOLE_JOB, StoredEnrichment)
  if (!stored) {
    const paths = rankedFiles(view)
      .slice(0, ENRICH_FILES)
      .map((file) => file.path)
    const files: Record<string, FileEnrichment> = {}
    const concepts: { term: string; summary: string }[] = []

    if (lite) {
      for (const path of paths) files[path] = staticFill(index, path)
    } else {
      const session = await openSession(deps, ctx)
      for (let start = 0; start < paths.length; start += ENRICH_BATCH) {
        ctx.signal.throwIfAborted()
        const batch = paths.slice(start, start + ENRICH_BATCH)
        const draft = await checkpointed(
          deps,
          ctx,
          'enrich',
          enrichBatchKey(start / ENRICH_BATCH),
          EnrichDraft,
          async () => {
            await index.load(batch)
            return session.ask('summarizer', {
              stage: 'enrich',
              sections: [promptFor('enrich'), dataFiles(index, batch)],
              schema: EnrichDraft,
              maxOutputTokens: 3000,
            })
          },
        )
        const allowed = new Set(batch)
        for (const item of draft.files) {
          if (!allowed.has(item.path)) continue
          files[item.path] = { summary: item.summary, layer: item.layer, domain: item.domain }
        }
        for (const concept of draft.concepts) concepts.push(concept)
      }
    }

    ctx.signal.throwIfAborted()
    await deps.checkpoints.write(ctx.job.id, 'enrich', WHOLE_JOB, {
      files,
      concepts,
    } satisfies StoredEnrichment)
    stored = { files, concepts }
  }

  // Whole-repo flows are a second, whole-job checkpoint so a retry resumes here without paying
  // for the summaries again (the guard above) while still finishing an interrupted flows call.
  if (!lite) await runFlows(deps, ctx, index, Object.keys(stored.files))
}

function staticFill(index: SourceIndex, path: string): FileEnrichment {
  return {
    summary: staticSummary(index, path),
    layer: layerFor(path),
    domain: domainFor(path),
  }
}

async function runFlows(
  deps: StageDeps,
  ctx: StageContext,
  index: SourceIndex,
  paths: readonly string[],
): Promise<void> {
  if (await deps.checkpoints.read(ctx.job.id, 'enrich', FLOWS_CHECKPOINT, FlowsDraft)) return
  const session = await openSession(deps, ctx)
  const draft = await checkpointed(deps, ctx, 'enrich', FLOWS_CHECKPOINT, FlowsDraft, async () => {
    await index.load(paths)
    return session.ask('summarizer', {
      stage: 'enrich',
      sections: [promptFor('flows'), dataSection('files', paths.join('\n'))],
      schema: FlowsDraft,
      maxOutputTokens: 2000,
    })
  })
  const allowed = new Set(paths)
  const flows = draft.flows
    .map((flow) => ({ ...flow, steps: flow.steps.filter((step) => allowed.has(step)) }))
    .filter((flow) => flow.steps.length > 0)
  await deps.checkpoints.write(ctx.job.id, 'enrich', FLOWS_CHECKPOINT, { flows } satisfies StoredFlows)
}

function staticSummary(index: SourceIndex, path: string): string {
  const names = index
    .symbolsIn(path)
    .filter((symbol) => symbol.exported)
    .slice(0, 6)
    .map((symbol) => symbol.name)
  return names.length > 0 ? `exports ${names.join(', ')}` : 'no exported symbols'
}

export function layerFor(path: string): GraphLayer {
  const value = path.toLowerCase()
  if (/(^|\/)(api|routes?|server|app|pages?|middleware)(\.|\/|$)/.test(value)) return 'api'
  if (/(^|\/)(components?|ui|views?|screens?|widgets?)(\.|\/|$)/.test(value)) return 'ui'
  if (/(^|\/)(db|database|schema|models?|store|repositories|repo|data)(\.|\/|$)/.test(value))
    return 'data'
  if (/(^|\/)(services?|lib|core|domain|usecases?)(\.|\/|$)/.test(value)) return 'service'
  return 'util'
}

function domainFor(path: string): string {
  const segments = path.split('/')
  const root = segments[0]
  if (root && root !== 'src' && root !== 'lib' && root !== 'app' && segments.length > 1)
    return root
  return segments.length > 1 ? (segments[1] ?? 'core') : 'core'
}