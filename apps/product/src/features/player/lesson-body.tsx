import type { LearnerLesson } from '@replo/contracts'
import { Button, Separator } from '@replo/ui'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import type { LessonPosition } from './lesson-navigation'
import { LessonBlocks } from './lesson-blocks'
import { LessonNeighbourLink } from './lesson-neighbour-link'
import { ShortcutHints } from './shortcut-hints'
import type { SourceRefMap } from './source-ref-map'
import type { TutorialLinks } from '@/lib/tutorial-paths'

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
            {completed ? 'Mark as not complete' : 'Mark lesson complete'}
          </Button>
          <LessonNeighbourLink direction="next" position={next} links={links} />
        </div>
        <ShortcutHints />
      </footer>
    </article>
  )
}
