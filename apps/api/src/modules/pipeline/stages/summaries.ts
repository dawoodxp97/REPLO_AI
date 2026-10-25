import { z } from 'zod'
import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { dataFiles, rankedPaths, sourceIndexOf } from '../context'
import { SummariesDraft } from '../drafts'
import type { SourceIndex } from '../grounding/source-index'
import { promptFor, systemFor } from '../prompts'
import { WHOLE_JOB } from '../outputs'
import { openSession, planOf, snapshotView, type StageDeps } from '../stage-deps'

const TOP_FILES = 24
const BATCH_FILES = 8
const MAX_STATIC_EXPORTS = 6

export const StoredSummaries = z.object({ files: z.record(z.string(), z.string()) })
export type StoredSummaries = z.infer<typeof StoredSummaries>

export async function runSummaries(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.outputs.read(ctx.job.id, 'summaries', WHOLE_JOB, StoredSummaries)) return

  const view = await snapshotView(deps, ctx)
  const index = sourceIndexOf(view, deps.indexing, ctx.job.snapshotId)
  const top = rankedPaths(view, TOP_FILES)
  await index.load(top)

  const files =
    planOf(ctx).models.summarizer === null
      ? staticSummaries(index, top)
      : await modelSummaries(deps, ctx, index, top)
  await deps.outputs.write(ctx.job.id, 'summaries', WHOLE_JOB, { files })
}

function staticSummaries(index: SourceIndex, paths: readonly string[]): Record<string, string> {
  return Object.fromEntries(
    paths.map((path) => {
      const names = index
        .symbolsIn(path)
        .filter((symbol) => symbol.exported)
        .slice(0, MAX_STATIC_EXPORTS)
        .map((symbol) => symbol.name)
      return [path, names.length > 0 ? `exports ${names.join(', ')}` : 'no exported symbols']
    }),
  )
}

async function modelSummaries(
  deps: StageDeps,
  ctx: StageContext,
  index: SourceIndex,
  paths: readonly string[],
): Promise<Record<string, string>> {
  const session = await openSession(deps, ctx)
  const system = systemFor(ctx.job.audience)
  const files: Record<string, string> = staticSummaries(index, paths)

  for (let start = 0; start < paths.length; start += BATCH_FILES) {
    ctx.signal.throwIfAborted()
    const batch = paths.slice(start, start + BATCH_FILES)
    const draft = await session.call('summarizer', {
      stage: 'summaries',
      system,
      prompt: `${promptFor('summaries')}\n\n${dataFiles(index, batch)}`,
      schema: SummariesDraft,
      maxOutputTokens: 2000,
    })
    const allowed = new Set(batch)
    for (const item of draft.files) if (allowed.has(item.path)) files[item.path] = item.summary
  }
  return files
}
