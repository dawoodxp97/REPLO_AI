import type { StageContext } from '../../../jobs/generate-tutorial.worker'
import { JobError } from '../../../jobs/errors'
import { dataFiles, fallbackFocusPaths, focusPathsOf } from '../context'
import {
  ChapterDraft,
  chapterDraftFor,
  type LessonDraft,
  type OutlineChapterDraft,
  OutlineDraft,
} from '../drafts'
import { dataSection, promptFor } from '../prompts'
import { WHOLE_JOB } from '../stored-outputs'
import { checkpointed, stageWorkspace, type StageDeps } from '../stage-deps'

export async function runLessons(deps: StageDeps, ctx: StageContext): Promise<void> {
  const outline = await deps.outputs.read(ctx.job.id, 'outline', WHOLE_JOB, OutlineDraft)
  if (!outline) throw new JobError('OUTLINE_MISSING', false, 'lessons need an outline')

  const { view, index, session } = await stageWorkspace(deps, ctx)

  for (const [position, chapter] of outline.chapters.entries()) {
    ctx.signal.throwIfAborted()
    await checkpointed(deps, ctx, 'lessons', chapter.key, ChapterDraft, async () => {
      const named = focusPathsOf(chapter.lessons)
      const focus = named.length > 0 ? named : fallbackFocusPaths(view, index)
      if (focus.length === 0)
        throw new JobError('OUTLINE_INVALID', false, `chapter ${chapter.key} names no source file`)
      await index.load(focus)
      const drafted = await session.ask('author', {
        stage: 'lessons',
        sections: [
          promptFor('lessons'),
          dataSection('chapter', JSON.stringify(chapterSpec(chapter))),
          dataFiles(index, focus),
        ],
        schema: chapterDraftFor(chapter.lessons.length),
        maxOutputTokens: 12000,
      })
      return alignLessons(chapter, drafted)
    })
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
