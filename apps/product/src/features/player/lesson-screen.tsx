'use client'

import type { ChapterDto, LearnerLesson, ProgressDto, TutorialOverviewDto } from '@replo/contracts'
import { Button } from '@replo/ui'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { LinkButton } from '@/components/link-button'
import { Sheet } from '@/components/sheet'
import { useMediaQuery } from '@/hooks/use-media-query'
import { withShare } from '@/features/tutorials/tutorial-outline'
import { lessonPath, tutorialPath, type TutorialRef } from '@/lib/tutorial-paths'
import { CommandPalette, type PaletteItem } from './command-palette'
import { LessonBody } from './lesson-body'
import {
  collectReferenceIds,
  flattenLessons,
  neighbours,
  nextReference,
  type LessonPosition,
} from './lesson-navigation'
import { OutlineNav } from './outline-nav'
import { readPanelLayout, writePanelLayout } from './panel-layout'
import { ReferenceSource } from './source-column'
import { useActiveReference } from './use-active-reference'
import { useLessonShortcuts } from './use-lesson-shortcuts'
import { useMarkLesson, useUnmarkLesson } from './use-lesson-progress'
import { QuizSection } from '@/features/quiz/quiz-section'
import { orpc } from '@/lib/orpc'

export interface LessonScreenProps {
  tutorial: TutorialRef
  overview: TutorialOverviewDto
  chapter: ChapterDto
  lesson: LearnerLesson
  progress: ProgressDto | undefined
  shareToken?: string
}

const SEPARATOR_CLASS = 'w-1 bg-border transition-colors hover:bg-primary/40 focus-visible:bg-ring'

export function LessonScreen({
  tutorial,
  overview,
  chapter,
  lesson,
  progress,
  shareToken,
}: LessonScreenProps) {
  const router = useRouter()
  const wide = useMediaQuery('(min-width: 768px)')
  const reference = useActiveReference()
  const [outlineOpen, setOutlineOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [defaultLayout] = useState(readPanelLayout)
  const markLesson = useMarkLesson()
  const unmarkLesson = useUnmarkLesson()
  const settings = useQuery(orpc.settings.get.queryOptions())
  const quizzesEnabled = settings.data?.quizzesEnabled ?? true
  const autoAdvance = settings.data?.autoAdvance ?? false

  const sequence = flattenLessons(overview.outline)
  const { previous, next } = neighbours(sequence, lesson.key)
  const references = collectReferenceIds(lesson)
  const completed = progress?.lessons[lesson.key] === 'completed'
  const chapterTitle =
    overview.outline.find((item) => item.key === chapter.chapter.key)?.title ??
    chapter.chapter.title
  const hrefFor = (position: LessonPosition) =>
    withShare(lessonPath(tutorial, position.chapterKey, position.lessonKey), shareToken)
  const nextHref = next ? hrefFor(next) : null

  useEffect(() => {
    if (nextHref) router.prefetch(nextHref)
  }, [nextHref, router])

  function toggleComplete() {
    if (completed) {
      unmarkLesson.mutate({ versionId: overview.versionId, lessonKey: lesson.key })
      return
    }
    markLesson.mutate(
      { versionId: overview.versionId, lessonKey: lesson.key, status: 'completed' },
      {
        onSuccess: () => {
          if (autoAdvance && next) router.push(hrefFor(next))
        },
      },
    )
  }

  useLessonShortcuts({
    next: () => {
      if (next) router.push(hrefFor(next))
    },
    previous: () => {
      if (previous) router.push(hrefFor(previous))
    },
    nextReference: () => reference.select(nextReference(references, reference.refId)),
    toggleComplete,
    openPalette: () => setPaletteOpen(true),
  })

  const commands: PaletteItem[] = [
    ...sequence.map((position) => ({
      id: `lesson:${position.lessonKey}`,
      label: `Go to ${position.lessonTitle}`,
      run: () => router.push(hrefFor(position)),
    })),
    {
      id: 'toggle-complete',
      label: completed ? 'Mark lesson as not complete' : 'Mark lesson complete',
      run: toggleComplete,
    },
    {
      id: 'source-explorer',
      label: 'Open the source explorer',
      run: () => router.push(`${tutorialPath(tutorial)}/code`),
    },
  ]

  const quizQuestions = lesson.quiz ?? []
  const quizSection =
    quizzesEnabled && quizQuestions.length > 0 ? (
      <QuizSection
        versionId={overview.versionId}
        lessonKey={lesson.key}
        questions={quizQuestions}
        references={chapter.sourceRefs}
        onOpenReference={(refId) => reference.select(refId)}
      />
    ) : null

  const body = (
    <LessonBody
      tutorial={tutorial}
      versionId={overview.versionId}
      shareToken={shareToken}
      chapterTitle={chapterTitle}
      lesson={lesson}
      quiz={quizSection}
      references={chapter.sourceRefs}
      previous={previous}
      next={next}
      completed={completed}
      togglePending={markLesson.isPending || unmarkLesson.isPending}
      onToggleComplete={toggleComplete}
      onOpenReference={(refId) => reference.select(refId)}
    />
  )

  const outline = (
    <OutlineNav
      tutorial={tutorial}
      outline={overview.outline}
      activeLessonKey={lesson.key}
      lessonStatus={progress?.lessons ?? {}}
      shareToken={shareToken}
    />
  )

  const source = (
    <ReferenceSource
      versionId={overview.versionId}
      refId={reference.refId}
      references={chapter.sourceRefs}
      shareToken={shareToken}
    />
  )

  return (
    <div className="flex min-h-dvh flex-col">
      <PlayerHeader
        title={overview.tutorial.title}
        overviewHref={withShare(tutorialPath(tutorial), shareToken)}
        sourceHref={`${tutorialPath(tutorial)}/code`}
        onOpenOutline={wide ? null : () => setOutlineOpen(true)}
        onOpenCommands={() => setPaletteOpen(true)}
      />

      {wide ? (
        <Group
          orientation="horizontal"
          id="player"
          defaultLayout={defaultLayout}
          onLayoutChanged={writePanelLayout}
          className="min-h-0 flex-1"
        >
          <Panel
            id="outline"
            defaultSize="20%"
            minSize="12%"
            className="overflow-y-auto border-r border-border p-4"
          >
            {outline}
          </Panel>
          <Separator className={SEPARATOR_CLASS} />
          <Panel id="lesson" minSize="35%" className="overflow-y-auto">
            <main>{body}</main>
          </Panel>
          <Separator className={SEPARATOR_CLASS} />
          <Panel
            id="source"
            defaultSize="34%"
            minSize="22%"
            className="overflow-y-auto border-l border-border bg-code-bg p-4"
          >
            {source}
          </Panel>
        </Group>
      ) : (
        <main className="flex-1">{body}</main>
      )}

      {!wide ? (
        <>
          <Sheet side="left" open={outlineOpen} onOpenChange={setOutlineOpen} title="Lessons">
            {outline}
          </Sheet>
          <Sheet
            side="bottom"
            open={reference.refId !== null}
            onOpenChange={(open) => {
              if (!open) reference.select(null)
            }}
            title="Source"
            description="The code this part of the lesson cites."
          >
            {source}
          </Sheet>
        </>
      ) : null}

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} items={commands} />
    </div>
  )
}

function PlayerHeader({
  title,
  overviewHref,
  sourceHref,
  onOpenOutline,
  onOpenCommands,
}: {
  title: string
  overviewHref: string
  sourceHref: string
  onOpenOutline: (() => void) | null
  onOpenCommands: () => void
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-2">
      <Link
        href={overviewHref}
        className="min-w-0 truncate font-serif text-lg font-semibold tracking-tight hover:text-primary"
      >
        {title}
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        {onOpenOutline ? (
          <Button variant="outline" size="sm" onClick={onOpenOutline}>
            Lessons
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={onOpenCommands}>
          Commands
        </Button>
        <LinkButton href={sourceHref} variant="ghost" size="sm">
          Source explorer
        </LinkButton>
      </div>
    </header>
  )
}
