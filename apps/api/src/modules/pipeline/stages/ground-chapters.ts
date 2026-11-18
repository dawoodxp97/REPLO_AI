import type { StageContext } from '../../../worker/generate-course'
import { JobError } from '../../../worker/errors'
import { draftPaths } from '../prompt-inputs'
import { type ArchitectureDraft, ChapterDraft, LessonDraft, type OutlineDraft } from '../drafts'
import { groundLesson, type Failure, type GroundedLesson } from '../grounding/lesson'
import type { LessonOutcome } from '../grounding/report'
import type { SourceIndex } from '../grounding/source-index'
import { dataSection, promptFor } from '../prompts'
import { lessonCheckpointKey, OVERVIEW_CHECKPOINT, StoredRepair } from '../checkpoints'
import { checkpointed, type StageDeps, type StageWorkspace } from '../stage-tools'

export interface GroundedDraft {
  outcome: LessonOutcome
  grounded: GroundedLesson
}

export interface GroundedChapter {
  spec: OutlineDraft['chapters'][number]
  lessons: GroundedDraft[]
  openQuestions: string[]
}

export interface GroundedCourse {
  overview: GroundedDraft
  chapters: GroundedChapter[]
  outcomes: LessonOutcome[]
}

interface GroundingRun {
  deps: StageDeps
  ctx: StageContext
  index: SourceIndex
  knownIdentifiers: ReadonlySet<string>
  session: StageWorkspace['session']
}

export async function groundChapters(
  deps: StageDeps,
  ctx: StageContext,
  workspace: StageWorkspace,
  inputs: { architecture: ArchitectureDraft; outline: OutlineDraft },
): Promise<GroundedCourse> {
  const { index, session } = workspace
  const run: GroundingRun = {
    deps,
    ctx,
    index,
    knownIdentifiers: await index.knownIdentifiers(),
    session,
  }
  const outcomes: LessonOutcome[] = []

  const overview = await groundAndRepair(
    {
      key: 'architecture',
      title: 'Architecture',
      minutes: 1,
      blocks: inputs.architecture.blocks,
      quiz: [],
    },
    OVERVIEW_CHECKPOINT,
    run,
  )
  outcomes.push(overview.outcome)

  const chapters: GroundedChapter[] = []
  for (const spec of inputs.outline.chapters) {
    ctx.signal.throwIfAborted()
    const drafted = await deps.checkpoints.read(ctx.job.id, 'lessons', spec.key, ChapterDraft)
    if (!drafted) throw new JobError('LESSONS_MISSING', false, `chapter ${spec.key} has no lessons`)

    const lessons: GroundedDraft[] = []
    for (const lesson of drafted.lessons) {
      ctx.signal.throwIfAborted()
      lessons.push(await groundAndRepair(lesson, lessonCheckpointKey(lesson.key), run))
    }
    outcomes.push(...lessons.map((entry) => entry.outcome))
    chapters.push({ spec, lessons, openQuestions: drafted.openQuestions })
  }

  return { overview, chapters, outcomes }
}

async function groundAndRepair(
  draft: LessonDraft,
  checkpointKey: string,
  run: GroundingRun,
): Promise<GroundedDraft> {
  const { deps, ctx, index, knownIdentifiers } = run
  await index.load(draftPaths(draft))
  const beforeRepair = groundLesson(draft, index, knownIdentifiers)
  const unrepaired: GroundedDraft = {
    outcome: { lessonKey: draft.key, first: beforeRepair, final: beforeRepair, repaired: false },
    grounded: beforeRepair,
  }
  if (beforeRepair.failures.length === 0) return unrepaired

  const { repaired } = await checkpointed(
    deps,
    ctx,
    'validate',
    checkpointKey,
    StoredRepair,
    async () => ({
      repaired: (await repairDraft(draft, beforeRepair.failures, run)) ?? null,
    }),
  )
  if (!repaired) return unrepaired

  await index.load(draftPaths(repaired))
  const afterRepair = groundLesson(repaired, index, knownIdentifiers)
  return {
    outcome: { lessonKey: draft.key, first: beforeRepair, final: afterRepair, repaired: true },
    grounded: afterRepair,
  }
}

async function repairDraft(
  draft: LessonDraft,
  failures: readonly Failure[],
  { session }: GroundingRun,
): Promise<LessonDraft | undefined> {
  try {
    const repaired = await session.ask('author', {
      stage: 'validate',
      sections: [
        promptFor('repair'),
        dataSection('lesson', JSON.stringify(draft)),
        dataSection(
          'problems',
          failures
            .map((failure) => `${failure.location} ${failure.code}: ${failure.detail}`)
            .join('\n'),
        ),
      ],
      schema: LessonDraft,
      maxOutputTokens: 8000,
    })
    return { ...repaired, key: draft.key, title: draft.title, minutes: draft.minutes }
  } catch (err) {
    if (err instanceof JobError && err.code === 'LLM_OUTPUT_INVALID') return undefined
    throw err
  }
}