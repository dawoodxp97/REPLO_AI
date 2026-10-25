import {
  CONTENT_SCHEMA_VERSION,
  TutorialContent,
  ValidationReport,
  type SourceRef,
} from '@replo/contracts'
import { z } from 'zod'
import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { JobError } from '../../../jobs/errors'
import { draftPaths, sourceIndexOf } from '../context'
import {
  ArchitectureDraft,
  ChapterDraft,
  JudgeDraft,
  LessonDraft,
  type OutlineChapterDraft,
  OutlineDraft,
} from '../drafts'
import type { LlmSession } from '../llm'
import { groundLesson, type Failure, type GroundedLesson } from '../grounding/lesson'
import { buildReport, type LessonOutcome } from '../grounding/report'
import type { SourceIndex } from '../grounding/source-index'
import { structuralDiagram } from '../grounding/structure'
import { dataSection, promptFor, systemFor } from '../prompts'
import { WHOLE_JOB } from '../outputs'
import { openSession, snapshotView, type StageDeps } from '../stage-deps'
import { CHAPTER_UNIT } from './lessons'

export const StoredValidation = z.object({ content: TutorialContent, report: ValidationReport })
export type StoredValidation = z.infer<typeof StoredValidation>

const MAX_OPEN_QUESTIONS = 12

interface Grounding {
  index: SourceIndex
  known: ReadonlySet<string>
  session: LlmSession
  system: string
}

interface GroundedDraft {
  outcome: LessonOutcome
  grounded: GroundedLesson
}

interface ChapterOutcome {
  spec: OutlineChapterDraft
  lessons: GroundedDraft[]
  openQuestions: string[]
}

export async function runValidate(deps: StageDeps, ctx: StageContext): Promise<void> {
  if (await deps.outputs.read(ctx.job.id, 'validate', WHOLE_JOB, StoredValidation)) return

  const view = await snapshotView(deps, ctx)
  const index = sourceIndexOf(view, deps.indexing, ctx.job.snapshotId)
  const architecture = await deps.outputs.read(
    ctx.job.id,
    'architecture',
    WHOLE_JOB,
    ArchitectureDraft,
  )
  const outline = await deps.outputs.read(ctx.job.id, 'outline', WHOLE_JOB, OutlineDraft)
  if (!architecture || !outline)
    throw new JobError('OUTLINE_MISSING', false, 'validation needs an architecture and an outline')

  const session = await openSession(deps, ctx)
  const grounding: Grounding = {
    index,
    known: await index.knownIdentifiers(),
    session,
    system: systemFor(ctx.job.audience),
  }
  const outcomes: LessonOutcome[] = []
  const judgeScores: number[] = []

  const overview = await groundAndRepair(
    {
      key: 'architecture',
      title: 'Architecture',
      minutes: 1,
      blocks: architecture.blocks,
      quiz: [],
    },
    grounding,
  )
  outcomes.push(overview.outcome)

  const chapters: ChapterOutcome[] = []
  for (const chapter of outline.chapters) {
    ctx.signal.throwIfAborted()
    const drafted = await deps.outputs.read(ctx.job.id, CHAPTER_UNIT, chapter.key, ChapterDraft)
    if (!drafted)
      throw new JobError('LESSONS_MISSING', false, `chapter ${chapter.key} has no lessons`)

    const lessons: GroundedDraft[] = []
    for (const lesson of drafted.lessons) {
      ctx.signal.throwIfAborted()
      lessons.push(await groundAndRepair(lesson, grounding))
    }
    outcomes.push(...lessons.map((entry) => entry.outcome))

    if (session.hasRole('judge')) judgeScores.push(await judgeChapter(chapter, lessons, grounding))
    chapters.push({ spec: chapter, lessons, openQuestions: drafted.openQuestions })
  }

  const architectureBlocks = overview.grounded.lesson.blocks
  const diagram = structuralDiagram(index)
  const content = TutorialContent.parse({
    schemaVersion: CONTENT_SCHEMA_VERSION,
    meta: {
      title: outline.title,
      repo: { owner: view.owner, name: view.name, commitSha: view.commitSha },
      audience: ctx.job.audience,
      objectives: outline.objectives,
      prerequisites: outline.prerequisites,
    },
    architecture: diagram ? { diagram, blocks: architectureBlocks } : undefined,
    chapters: chapters.map((chapter) => ({
      key: chapter.spec.key,
      title: chapter.spec.title,
      summary: chapter.spec.summary,
      objectives: chapter.spec.objectives,
      prerequisites: chapter.spec.prerequisites,
      lessons: chapter.lessons.map((entry) => entry.grounded.lesson),
    })),
    sourceRefs: mergedRefs([overview, ...chapters.flatMap((chapter) => chapter.lessons)]),
    furtherReading: [],
    openQuestions: uniqueQuestions([
      ...architecture.openQuestions,
      ...chapters.flatMap((chapter) => chapter.openQuestions),
    ]),
  })

  await deps.outputs.write(ctx.job.id, 'validate', WHOLE_JOB, {
    content,
    report: buildReport(outcomes, judgeScores),
  })
}

async function groundAndRepair(draft: LessonDraft, grounding: Grounding): Promise<GroundedDraft> {
  const { index, known } = grounding
  await index.load(draftPaths(draft))
  const first = groundLesson(draft, index, known)
  const repaired =
    first.failures.length === 0 ? undefined : await repairDraft(draft, first.failures, grounding)
  if (repaired) await index.load(draftPaths(repaired))
  const final = repaired ? groundLesson(repaired, index, known) : first
  return {
    outcome: { lessonKey: draft.key, first, final, repaired: repaired !== undefined },
    grounded: final,
  }
}

async function repairDraft(
  draft: LessonDraft,
  failures: readonly Failure[],
  grounding: Grounding,
): Promise<LessonDraft | undefined> {
  try {
    const repaired = await grounding.session.call('author', {
      stage: 'validate',
      system: grounding.system,
      prompt: [
        promptFor('repair'),
        dataSection('lesson', JSON.stringify(draft)),
        dataSection(
          'problems',
          failures
            .map((failure) => `${failure.location} ${failure.code}: ${failure.detail}`)
            .join('\n'),
        ),
      ].join('\n\n'),
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
  grounding: Grounding,
): Promise<number> {
  const judged = await grounding.session.call('judge', {
    stage: 'validate',
    system: grounding.system,
    prompt: [
      promptFor('judge'),
      dataSection(
        'chapter',
        JSON.stringify({
          title: chapter.title,
          lessons: lessons.map((entry) => entry.grounded.lesson),
        }),
      ),
    ].join('\n\n'),
    schema: JudgeDraft,
    maxOutputTokens: 1500,
  })
  return judged.score
}

function mergedRefs(entries: readonly GroundedDraft[]): Record<string, SourceRef> {
  return Object.fromEntries(entries.flatMap((entry) => Object.entries(entry.grounded.refs)))
}

function uniqueQuestions(questions: readonly string[]): string[] {
  const cleaned = questions
    .map((question) => question.trim())
    .filter((question) => question.length > 0)
  return [...new Set(cleaned)].slice(0, MAX_OPEN_QUESTIONS)
}
