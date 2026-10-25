import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { JobError } from '../../../jobs/errors'
import { dataFiles, focusPathsOf, sourceIndexOf } from '../context'
import { ChapterDraft, type OutlineChapterDraft, OutlineDraft, type LessonDraft } from '../drafts'
import { dataSection, promptFor, systemFor } from '../prompts'
import { WHOLE_JOB } from '../outputs'
import { openSession, snapshotView, type StageDeps } from '../stage-deps'

export const CHAPTER_UNIT = 'lessons'

export async function runLessons(deps: StageDeps, ctx: StageContext): Promise<void> {
  const outline = await deps.outputs.read(ctx.job.id, 'outline', WHOLE_JOB, OutlineDraft)
  if (!outline) throw new JobError('OUTLINE_MISSING', false, 'lessons need an outline')

  const view = await snapshotView(deps, ctx)
  const index = sourceIndexOf(view, deps.indexing, ctx.job.snapshotId)
  const session = await openSession(deps, ctx)
  const system = systemFor(ctx.job.audience)

  for (const [position, chapter] of outline.chapters.entries()) {
    ctx.signal.throwIfAborted()
    if (!(await deps.outputs.read(ctx.job.id, CHAPTER_UNIT, chapter.key, ChapterDraft))) {
      const focus = focusPathsOf(chapter.lessons)
      await index.load(focus)
      const drafted = await session.call('author', {
        stage: 'lessons',
        system,
        prompt: [
          promptFor('lessons'),
          dataSection('chapter', JSON.stringify(chapterSpec(chapter))),
          dataFiles(index, focus),
        ].join('\n\n'),
        schema: ChapterDraft,
        maxOutputTokens: 12000,
      })
      await deps.outputs.write(
        ctx.job.id,
        CHAPTER_UNIT,
        chapter.key,
        alignLessons(chapter, drafted),
      )
    }
    await ctx.progress({ chapter: chapter.key, done: position + 1, total: outline.chapters.length })
  }
}

function chapterSpec(chapter: OutlineChapterDraft) {
  return {
    key: chapter.key,
    title: chapter.title,
    summary: chapter.summary,
    objectives: chapter.objectives,
    prerequisites: chapter.prerequisites,
    lessons: chapter.lessons.map((lesson) => ({
      key: lesson.key,
      title: lesson.title,
      minutes: lesson.minutes,
    })),
  }
}

function alignLessons(chapter: OutlineChapterDraft, drafted: ChapterDraft): ChapterDraft {
  const lessons = chapter.lessons.map((spec, position): LessonDraft => {
    const lesson = drafted.lessons[position]
    if (!lesson) throw new JobError('LLM_OUTPUT_INVALID', false, 'chapter is missing a lesson')
    return { ...lesson, key: spec.key, title: spec.title, minutes: spec.minutes }
  })
  return { lessons, openQuestions: drafted.openQuestions }
}
