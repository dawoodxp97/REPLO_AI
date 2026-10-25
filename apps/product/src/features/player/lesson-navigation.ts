import type { LearnerLesson, TutorialOverviewDto } from '@replo/contracts'

export interface LessonPosition {
  chapterKey: string
  chapterTitle: string
  lessonKey: string
  lessonTitle: string
}

export function flattenLessons(outline: TutorialOverviewDto['outline']): LessonPosition[] {
  return outline.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({
      chapterKey: chapter.key,
      chapterTitle: chapter.title,
      lessonKey: lesson.key,
      lessonTitle: lesson.title,
    })),
  )
}

export function neighbours(
  sequence: readonly LessonPosition[],
  lessonKey: string,
): { previous: LessonPosition | null; next: LessonPosition | null } {
  const index = sequence.findIndex((position) => position.lessonKey === lessonKey)
  if (index < 0) return { previous: null, next: null }
  return {
    previous: sequence[index - 1] ?? null,
    next: sequence[index + 1] ?? null,
  }
}

export function collectReferenceIds(lesson: LearnerLesson): string[] {
  const fromBlocks = lesson.blocks.flatMap((block) => {
    switch (block.type) {
      case 'prose':
        return block.evidence.map((evidence) => evidence.refId)
      case 'code':
        return [block.refId]
      case 'exercise':
        return block.solutionRefs
      case 'callout':
      case 'diagram':
        return []
    }
  })
  const fromQuiz = (lesson.quiz ?? []).flatMap((question) =>
    question.evidence.map((evidence) => evidence.refId),
  )
  return [...new Set([...fromBlocks, ...fromQuiz])]
}

export function findChapterKey(
  outline: TutorialOverviewDto['outline'],
  lessonKey: string,
): string | undefined {
  return outline.find((chapter) => chapter.lessons.some((lesson) => lesson.key === lessonKey))?.key
}

export function nextReference(
  references: readonly string[],
  current: string | null,
): string | null {
  if (references.length === 0) return null
  const index = current === null ? -1 : references.indexOf(current)
  return references[(index + 1) % references.length] ?? null
}
