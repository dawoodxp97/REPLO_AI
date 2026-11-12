import type { LearnerLesson } from '@replo/contracts'
import { Button, cn, Separator } from '@replo/ui'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import Link from 'next/link'
import type { ReactNode } from 'react'
import { ROW_LINK_CLASS } from '@/components/row-link'
import type { TutorialLinks } from '@/lib/tutorial-paths'
import { LessonBlocks } from '../blocks/lesson-blocks'
import { KeyCombo } from '../commands/command-palette'
import { LESSON_SHORTCUT_HINTS } from '../commands/shortcuts'
import type { SourceRefMap } from '../source/source-refs'
import type { LessonPosition } from './lesson-navigation'

export interface LessonBodyProps {
  links: TutorialLinks
  versionId: string
  shareToken?: string
  chapterTitle: string
  lesson: LearnerLesson
  quiz: ReactNode
  references: SourceRefMap
  previous: LessonPosition | null
  next: LessonPosition | null
  completed: boolean
  togglePending: boolean
  onToggleComplete: () => void
  onOpenReference: (refId: string) => void
}

export function LessonBody({
  links,
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
      <header className="space-y-1.5">
        <p className="text-sm text-muted-foreground">{chapterTitle}</p>
        <h1 id="lesson-title" className="text-3xl font-semibold tracking-tight text-balance">
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

      <footer className="space-y-5">
        <Separator />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <LessonNeighbourLink direction="previous" position={previous} links={links} />
          <Button
            variant={completed ? 'outline' : 'default'}
            aria-pressed={completed}
            disabled={togglePending}
            onClick={onToggleComplete}
          >
            {completed ? <Check className="text-observed-text" /> : null}
            {completed ? 'Completed' : 'Mark lesson complete'}
          </Button>
          <LessonNeighbourLink direction="next" position={next} links={links} />
        </div>
        <ShortcutHints />
      </footer>
    </article>
  )
}

interface LessonNeighbourLinkProps {
  direction: 'previous' | 'next'
  position: LessonPosition | null
  links: TutorialLinks
}

function LessonNeighbourLink({ direction, position, links }: LessonNeighbourLinkProps) {
  if (position === null) return <span />
  const previous = direction === 'previous'

  return (
    <Link
      href={links.lesson(position)}
      rel={previous ? 'prev' : 'next'}
      className={cn(
        ROW_LINK_CLASS,
        'group flex max-w-[16rem] min-w-0 items-center gap-2 text-sm',
        previous ? 'text-left' : 'flex-row-reverse text-right',
      )}
    >
      {previous ? (
        <ArrowLeft className="size-4 shrink-0 text-muted-foreground" />
      ) : (
        <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0">
        <span className="block text-xs text-muted-foreground">
          {previous ? 'Previous' : 'Next'}
        </span>
        <span className="block truncate font-medium">{position.lessonTitle}</span>
      </span>
    </Link>
  )
}

function ShortcutHints() {
  return (
    <ul
      aria-label="Keyboard shortcuts"
      className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground pointer-coarse:hidden"
    >
      {LESSON_SHORTCUT_HINTS.map((hint) => (
        <li key={hint.label} className="flex items-center gap-1.5">
          <KeyCombo keys={hint.keys} />
          {hint.label}
        </li>
      ))}
    </ul>
  )
}
