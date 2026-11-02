import { ArrowLeft, ArrowRight } from 'lucide-react'
import { ROW_LINK_CLASS } from '@/components/row-link'
import Link from 'next/link'
import { cn } from '@replo/ui'
import type { LessonPosition } from './lesson-navigation'
import type { TutorialLinks } from '@/lib/tutorial-paths'

export interface LessonNeighbourLinkProps {
  direction: 'previous' | 'next'
  position: LessonPosition | null
  links: TutorialLinks
}

export function LessonNeighbourLink({ direction, position, links }: LessonNeighbourLinkProps) {
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
