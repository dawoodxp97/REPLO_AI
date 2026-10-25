import type { Metadata } from 'next'
import { LessonPage } from '@/features/player/lesson-page'

export const metadata: Metadata = { title: 'Lesson' }

export default async function LessonRoute({
  params,
}: {
  params: Promise<{
    owner: string
    repo: string
    slug: string
    chapterKey: string
    lessonKey: string
  }>
}) {
  const { owner, repo, slug, chapterKey, lessonKey } = await params
  return (
    <LessonPage tutorial={{ owner, repo, slug }} chapterKey={chapterKey} lessonKey={lessonKey} />
  )
}
