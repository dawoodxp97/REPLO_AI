import type { LearnerLesson, SourceRef } from '@replo/contracts'
import type { ReactNode } from 'react'
import { Button, cn } from '@replo/ui'
import Link from 'next/link'
import { lessonPath, type TutorialRef } from '@/lib/tutorial-paths'
import { withShare } from '@/features/tutorials/tutorial-outline'
import type { LessonPosition } from './lesson-navigation'
import { LessonBlocks } from './lesson-blocks'

export interface LessonBodyProps {
  tutorial: TutorialRef
  versionId: string
  shareToken?: string
  chapterTitle: string
  lesson: LearnerLesson
  quiz: ReactNode
  references: Readonly<Record<string, SourceRef | undefined>>
  previous: LessonPosition | null
  next: LessonPosition | null
  completed: boolean
  togglePending: boolean
  onToggleComplete: () => void
  onOpenReference: (refId: string) => void
}

export function LessonBody({
  tutorial,
  versionId,
  shareToken,
  chapterTitle,
  lesson,
  quiz,
  references,
  previous,
  next,
  completed,
  togglePending,
  onToggleComplete,
  onOpenReference,
}: LessonBodyProps) {
  return (
    <article
      aria-labelledby="lesson-title"
      className="mx-auto w-full max-w-[68ch] space-y-8 px-4 py-8 sm:px-8"
    >
      <header className="space-y-2">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{chapterTitle}</p>
        <h1 id="lesson-title" className="font-serif text-3xl font-semibold tracking-tight">
          {lesson.title}
        </h1>
      </header>

      <LessonBlocks
        versionId={versionId}
        blocks={lesson.blocks}
        references={references}
        shareToken={shareToken}
        onOpenReference={onOpenReference}
      />

      {quiz}

      <footer className="space-y-4 border-t border-border pt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {previous ? (
            <Link
              href={withShare(
                lessonPath(tutorial, previous.chapterKey, previous.lessonKey),
                shareToken,
              )}
              className="text-sm text-primary underline underline-offset-4"
            >
              ← {previous.lessonTitle}
            </Link>
          ) : (
            <span />
          )}
          <Button
            variant={completed ? 'outline' : 'primary'}
            aria-pressed={completed}
            disabled={togglePending}
            onClick={onToggleComplete}
          >
            {completed ? 'Mark as not complete' : 'Mark lesson complete'}
          </Button>
          {next ? (
            <Link
              href={withShare(lessonPath(tutorial, next.chapterKey, next.lessonKey), shareToken)}
              className={cn('text-sm text-primary underline underline-offset-4')}
            >
              {next.lessonTitle} →
            </Link>
          ) : (
            <span />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Keys: n next lesson · p previous lesson · r next source reference · m mark complete · Ctrl
          or ⌘ + K commands
        </p>
      </footer>
    </article>
  )
}
