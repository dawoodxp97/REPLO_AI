'use client'

import type { ChapterDto, LearnerLesson, ProgressDto, TutorialOverviewDto } from '@replo/contracts'
import { useState } from 'react'
import { QuizSection } from '@/features/quiz/quiz-section'
import type { TutorialRef } from '@/lib/tutorial-paths'
import { CommandPalette } from './command-palette'
import { LessonBody } from './lesson-body'
import { OutlineNav } from './outline-nav'
import { PlayerLayout } from './player-layout'
import { nextReference } from './lesson-navigation'
import { ReferenceSource } from './source-column'
import { useTutorialLinks } from './use-tutorial-links'
import { useActiveReference } from './use-active-reference'
import { useLessonCommands } from './use-lesson-commands'
import { useLessonCompletion } from './use-lesson-completion'
import { useLessonNavigation } from './use-lesson-navigation'
import { useLessonShortcuts } from './use-lesson-shortcuts'
import { usePlayerSettings } from './use-player-settings'

export interface LessonScreenProps {
  tutorial: TutorialRef
  overview: TutorialOverviewDto
  chapter: ChapterDto
  lesson: LearnerLesson
  progress: ProgressDto | undefined
  shareToken?: string
  version?: number
}

export function LessonScreen({
  tutorial,
  overview,
  chapter,
  lesson,
  progress,
  shareToken,
  version,
}: LessonScreenProps) {
  const links = useTutorialLinks(tutorial, { version, shareToken })
  const reference = useActiveReference()
  const [paletteOpen, setPaletteOpen] = useState(false)
  const { quizzesEnabled, autoAdvance } = usePlayerSettings()
  const navigation = useLessonNavigation({ overview, chapter, lesson, links })
  const completed = progress?.lessons[lesson.key] === 'completed'
  const completion = useLessonCompletion({
    versionId: overview.versionId,
    lessonKey: lesson.key,
    completed,
    advanceTo: autoAdvance ? navigation.nextHref : null,
  })
  const commands = useLessonCommands({
    navigation,
    links,
    completed,
    onToggleComplete: completion.toggle,
  })

  useLessonShortcuts({
    next: navigation.goNext,
    previous: navigation.goPrevious,
    nextReference: () => reference.select(nextReference(navigation.referenceIds, reference.refId)),
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
        references={chapter.sourceRefs}
        onOpenReference={reference.select}
      />
    ) : null

  return (
    <>
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
            references={chapter.sourceRefs}
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
            refId={reference.refId}
            references={chapter.sourceRefs}
            shareToken={shareToken}
          />
        }
        sourceOpen={reference.refId !== null}
        onCloseSource={() => reference.select(null)}
      />
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commands} />
    </>
  )
}
