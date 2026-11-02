import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { JobError } from '../../../jobs/errors'
import { draftPaths } from '../context'
import {
  type ArchitectureDraft,
  ChapterDraft,
  JudgeDraft,
  LessonDraft,
  type OutlineChapterDraft,
  type OutlineDraft,
} from '../drafts'
import { groundLesson, type Failure, type GroundedLesson } from '../grounding/lesson'
import type { LessonOutcome } from '../grounding/report'
import type { SourceIndex } from '../grounding/source-index'
import { dataSection, promptFor } from '../prompts'
import { judgeUnit, lessonUnit, OVERVIEW_UNIT, StoredJudge, StoredRepair } from '../stored-outputs'
import { checkpointed, type StageDeps, type StageWorkspace } from '../stage-deps'

export interface GroundedDraft {
  outcome: LessonOutcome
  grounded: GroundedLesson
}

export interface GroundedChapter {
  spec: OutlineChapterDraft
  lessons: GroundedDraft[]
  openQuestions: string[]
}

export interface GroundedTutorial {
  overview: GroundedDraft
  chapters: GroundedChapter[]
  outcomes: LessonOutcome[]
  judgeScores: number[]
}

interface GroundingRun {
  deps: StageDeps
  ctx: StageContext
  index: SourceIndex
  known: ReadonlySet<string>
  session: StageWorkspace['session']
}

export async function groundChapters(
  deps: StageDeps,
  ctx: StageContext,
  workspace: StageWorkspace,
  inputs: { architecture: ArchitectureDraft; outline: OutlineDraft },
): Promise<GroundedTutorial> {
  const { index, session } = workspace
  const run: GroundingRun = { deps, ctx, index, known: await index.knownIdentifiers(), session }
  const outcomes: LessonOutcome[] = []
  const judgeScores: number[] = []

  const overview = await groundAndRepair(
    {
      key: 'architecture',
      title: 'Architecture',
      minutes: 1,
      blocks: inputs.architecture.blocks,
      quiz: [],
    },
    OVERVIEW_UNIT,
    run,
  )
  outcomes.push(overview.outcome)

  const chapters: GroundedChapter[] = []
  for (const spec of inputs.outline.chapters) {
    ctx.signal.throwIfAborted()
    const drafted = await deps.outputs.read(ctx.job.id, 'lessons', spec.key, ChapterDraft)
    if (!drafted) throw new JobError('LESSONS_MISSING', false, `chapter ${spec.key} has no lessons`)

    const lessons: GroundedDraft[] = []
    for (const lesson of drafted.lessons) {
      ctx.signal.throwIfAborted()
      lessons.push(await groundAndRepair(lesson, lessonUnit(lesson.key), run))
    }
    outcomes.push(...lessons.map((entry) => entry.outcome))

    if (session.hasRole('judge')) judgeScores.push(await judgeChapter(spec, lessons, run))
    chapters.push({ spec, lessons, openQuestions: drafted.openQuestions })
  }

  return { overview, chapters, outcomes, judgeScores }
}

async function groundAndRepair(
  draft: LessonDraft,
  unit: string,
  run: GroundingRun,
): Promise<GroundedDraft> {
  const { deps, ctx, index, known } = run
  await index.load(draftPaths(draft))
  const first = groundLesson(draft, index, known)
  const unrepaired: GroundedDraft = {
    outcome: { lessonKey: draft.key, first, final: first, repaired: false },
    grounded: first,
  }
  if (first.failures.length === 0) return unrepaired

  const { repaired } = await checkpointed(deps, ctx, 'validate', unit, StoredRepair, async () => ({
    repaired: (await repairDraft(draft, first.failures, run)) ?? null,
  }))
  if (!repaired) return unrepaired

  await index.load(draftPaths(repaired))
  const final = groundLesson(repaired, index, known)
  return {
    outcome: { lessonKey: draft.key, first, final, repaired: true },
    grounded: final,
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

async function judgeChapter(
  chapter: OutlineChapterDraft,
  lessons: readonly GroundedDraft[],
  { deps, ctx, session }: GroundingRun,
): Promise<number> {
  const { score } = await checkpointed(
    deps,
    ctx,
    'validate',
    judgeUnit(chapter.key),
    StoredJudge,
    async () => {
      const judged = await session.ask('judge', {
        stage: 'validate',
        sections: [
          promptFor('judge'),
          dataSection(
            'chapter',
            JSON.stringify({
              title: chapter.title,
              lessons: lessons.map((entry) => entry.grounded.lesson),
            }),
          ),
        ],
        schema: JudgeDraft,
        maxOutputTokens: 1500,
      })
      return { score: judged.score }
    },
  )
  return score
}
