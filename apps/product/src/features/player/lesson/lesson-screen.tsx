'use client'

import type { ChapterDto, LearnerLesson, ProgressDto, TutorialOverviewDto } from '@replo/contracts'
import { useQuery } from '@tanstack/react-query'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useState } from 'react'
import { QuizSection } from '@/features/quiz/quiz-section'
import { useMediaQuery } from '@/hooks/use-media-query'
import { orpc } from '@/lib/orpc'
import type { TutorialRef } from '@/lib/tutorial-paths'
import { ShownReferenceContext } from '../blocks/evidence-chips'
import { CommandPalette } from '../commands/command-palette'
import { useLessonCommands } from '../commands/use-lesson-commands'
import { useLessonShortcuts } from '../commands/use-lesson-shortcuts'
import { ReferenceSource } from '../source/reference-source'
import { useTutorialLinks } from '../use-tutorial'
import { LessonBody } from './lesson-body'
import { firstResolvedReference, nextReference } from './lesson-navigation'
import { OutlineNav } from './outline-nav'
import { PlayerLayout, SOURCE_COLUMN_QUERY } from './player-layout'
import { useLessonCompletion } from './use-lesson-completion'
import { useLessonNavigation } from './use-lesson-navigation'

export interface LessonScreenProps {
  tutorial: TutorialRef
  overview: TutorialOverviewDto
  chapterData: ChapterDto
  lesson: LearnerLesson
  progress: ProgressDto | undefined
  shareToken?: string
  version?: number
}

export function LessonScreen({
  tutorial,
  overview,
  chapterData,
  lesson,
  progress,
  shareToken,
  version,
}: LessonScreenProps) {
  const links = useTutorialLinks(tutorial, { version, shareToken })
  const reference = useActiveReference()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { quizzesEnabled, autoAdvance } = usePlayerSettings()
  const navigation = useLessonNavigation({ overview, chapterData, lesson, links })
  const completed = progress?.lessons[lesson.key] === 'completed'
  const completion = useLessonCompletion({
    versionId: overview.versionId,
    lessonKey: lesson.key,
    completed,
    advanceTo: autoAdvance ? navigation.nextHref : null,
  })
  const sourceColumnVisible = useMediaQuery(SOURCE_COLUMN_QUERY)
  const shownRefId =
    reference.refId ??
    (sourceColumnVisible
      ? firstResolvedReference(navigation.referenceIds, chapterData.sourceRefs)
      : null)
  const commands = useLessonCommands({
    navigation,
    links,
    completed,
    onToggleComplete: completion.toggle,
  })

  useLessonShortcuts({
    next: navigation.goNext,
    previous: navigation.goPrevious,
    nextReference: () => reference.select(nextReference(navigation.referenceIds, shownRefId)),
    toggleComplete: completion.toggle,
    palette: () => setPaletteOpen((open) => !open),
  })

  const questions = lesson.quiz ?? []
  const quiz =
    quizzesEnabled && questions.length > 0 ? (
      <QuizSection
        versionId={overview.versionId}
        lessonKey={lesson.key}
        questions={questions}
        references={chapterData.sourceRefs}
        onOpenReference={reference.select}
      />
    ) : null

  return (
    <ShownReferenceContext value={shownRefId}>
      <PlayerLayout
        scrollKey={lesson.key}
        title={overview.tutorial.title}
        overviewHref={links.overview()}
        sourceHref={links.sourceExplorer()}
        onOpenCommands={() => setPaletteOpen(true)}
        outline={
          <OutlineNav
            links={links}
            outline={overview.outline}
            activeLessonKey={lesson.key}
            lessonStatus={progress?.lessons ?? {}}
          />
        }
        body={
          <LessonBody
            links={links}
            versionId={overview.versionId}
            shareToken={shareToken}
            chapterTitle={navigation.chapterTitle}
            lesson={lesson}
            quiz={quiz}
            references={chapterData.sourceRefs}
            previous={navigation.previous}
            next={navigation.next}
            completed={completed}
            togglePending={completion.pending}
            onToggleComplete={completion.toggle}
            onOpenReference={reference.select}
          />
        }
        source={
          <ReferenceSource
            versionId={overview.versionId}
            refId={shownRefId}
            references={chapterData.sourceRefs}
            shareToken={shareToken}
          />
        }
        sourceOpen={reference.refId !== null}
        onCloseSource={() => reference.select(null)}
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commands} />
    </ShownReferenceContext>
  )
}

function useActiveReference() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()
  const refId = params.get('ref')

  const select = useCallback(
    (next: string | null) => {
      const search = new URLSearchParams(params.toString())
      if (next === null) search.delete('ref')
      else search.set('ref', next)
      const query = search.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [params, pathname, router],
  )

  return { refId, select }
}

function usePlayerSettings(): { quizzesEnabled: boolean; autoAdvance: boolean } {
  const settings = useQuery(orpc.settings.get.queryOptions())
  return {
    quizzesEnabled: settings.data?.quizzesEnabled ?? true,
    autoAdvance: settings.data?.autoAdvance ?? false,
  }
}
