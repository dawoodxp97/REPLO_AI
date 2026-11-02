import type { ChapterDto, LearnerLesson, TutorialOverviewDto } from '@replo/contracts'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import {
  collectReferenceIds,
  flattenLessons,
  neighbours,
  type LessonPosition,
} from './lesson-navigation'
import type { TutorialLinks } from '@/lib/tutorial-paths'

export interface LessonNavigationInput {
  overview: TutorialOverviewDto
  chapterData: ChapterDto
  lesson: LearnerLesson
  links: TutorialLinks
}

export interface LessonNavigation {
  sequence: LessonPosition[]
  previous: LessonPosition | null
  next: LessonPosition | null
  referenceIds: string[]
  chapterTitle: string
  nextHref: string | null
  goTo: (position: LessonPosition) => void
  goNext: () => void
  goPrevious: () => void
}

export function useLessonNavigation({
  overview,
  chapterData,
  lesson,
  links,
}: LessonNavigationInput): LessonNavigation {
  const router = useRouter()
  const sequence = flattenLessons(overview.outline)
  const { previous, next } = neighbours(sequence, lesson.key)
  const nextHref = next ? links.lesson(next) : null

  useEffect(() => {
    if (nextHref) router.prefetch(nextHref)
  }, [nextHref, router])

  function goTo(position: LessonPosition) {
    router.push(links.lesson(position))
  }

  return {
    sequence,
    previous,
    next,
    referenceIds: collectReferenceIds(lesson),
    chapterTitle: chapterData.chapter.title,
    nextHref,
    goTo,
    goNext: () => {
      if (next) goTo(next)
    },
    goPrevious: () => {
      if (previous) goTo(previous)
    },
  }
}
