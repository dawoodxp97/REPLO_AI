import type { Lesson, TutorialContent } from '@replo/contracts'

export function allLessons(content: TutorialContent): { chapterKey: string; lesson: Lesson }[] {
  return content.chapters.flatMap((chapter) =>
    chapter.lessons.map((lesson) => ({ chapterKey: chapter.key, lesson })),
  )
}

export function lessonRefIds(lesson: Lesson): string[] {
  const fromBlocks = lesson.blocks.flatMap((block) => {
    if (block.type === 'prose') return block.evidence.map((item) => item.refId)
    if (block.type === 'code') return [block.refId]
    return []
  })
  const fromQuiz = (lesson.quiz ?? []).flatMap((question) =>
    question.evidence.map((item) => item.refId),
  )
  return [...fromBlocks, ...fromQuiz]
}
