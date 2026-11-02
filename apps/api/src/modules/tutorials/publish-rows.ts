import type { TutorialContent } from '@replo/contracts'
import { allLessons, lessonRefIds } from './lesson-content'

const SLUG_MAX_LENGTH = 60
const FALLBACK_SLUG = 'tutorial'

export function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/^-+|-+$/g, '')
  return slug.length > 0 ? slug : FALLBACK_SLUG
}

export function lessonRows(versionId: string, content: TutorialContent) {
  return allLessons(content).map(({ chapterKey, lesson }, position) => ({
    versionId,
    chapterKey,
    lessonKey: lesson.key,
    title: lesson.title,
    position,
  }))
}

export function sourceRefRows(versionId: string, content: TutorialContent) {
  const lessons = allLessons(content)
  const lessonOfRef = new Map<string, string>()
  for (const { lesson } of lessons) {
    for (const refId of lessonRefIds(lesson)) {
      if (!lessonOfRef.has(refId)) lessonOfRef.set(refId, lesson.key)
    }
  }
  const fallbackLessonKey = lessons[0]?.lesson.key
  return Object.entries(content.sourceRefs).flatMap(([refId, ref]) => {
    const lessonKey = lessonOfRef.get(refId) ?? fallbackLessonKey
    if (lessonKey === undefined) return []
    return [
      {
        versionId,
        lessonKey,
        refId,
        path: ref.path,
        startLine: ref.startLine,
        endLine: ref.endLine,
        blobSha: ref.blobSha,
        symbolKey: ref.symbolKey ?? null,
      },
    ]
  })
}
