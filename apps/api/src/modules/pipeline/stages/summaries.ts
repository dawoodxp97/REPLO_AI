import type { StageContext } from '../../../worker/generate-tutorial'
import { dataFiles, rankedPaths } from '../prompt-inputs'
import { SummariesDraft } from '../drafts'
import type { SourceIndex } from '../grounding/source-index'
import { promptFor } from '../prompts'
import { StoredSummaries, WHOLE_JOB } from '../checkpoints'
import { checkpointed, openSession, planOf, sourceWorkspace, type StageDeps } from '../stage-tools'

const TOP_FILES = 24
const BATCH_FILES = 8
const MAX_STATIC_EXPORTS = 6

export async function runSummaries(deps: StageDeps, ctx: StageContext): Promise<void> {
  await checkpointed(deps, ctx, 'summaries', WHOLE_JOB, StoredSummaries, async () => {
    const { view, index } = await sourceWorkspace(deps, ctx)
    const top = rankedPaths(view, TOP_FILES)
    await index.load(top)

    const files =
      planOf(ctx).models.summarizer === null
        ? staticSummaries(index, top)
        : await modelSummaries(deps, ctx, index, top)
    return { files }
  })
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
  const files: Record<string, string> = staticSummaries(index, paths)

  for (let start = 0; start < paths.length; start += BATCH_FILES) {
    ctx.signal.throwIfAborted()
    const batch = paths.slice(start, start + BATCH_FILES)
    const draft = await session.ask('summarizer', {
      stage: 'summaries',
      sections: [promptFor('summaries'), dataFiles(index, batch)],
      schema: SummariesDraft,
      maxOutputTokens: 2000,
    })
    const allowed = new Set(batch)
    for (const item of draft.files) if (allowed.has(item.path)) files[item.path] = item.summary
  }
  return files
}
