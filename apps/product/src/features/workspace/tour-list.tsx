'use client'

import type { CourseOverviewDto, Tour, TourStep } from '@replo/contracts'
import Link from 'next/link'
import type { CourseLinks } from '@/lib/course-paths'

export function TourList({
  tours,
  overview,
  links,
  onSelectNode,
}: {
  tours: readonly Tour[]
  overview: CourseOverviewDto
  links: CourseLinks
  onSelectNode: (nodeId: string) => void
}) {
  if (tours.length === 0) {
    return <p className="text-sm text-muted-foreground">No guided tours for this snapshot.</p>
  }

  return (
    <ul className="space-y-5">
      {tours.map((tour) => (
        <li key={tour.key} className="space-y-1.5">
          <h3 className="text-sm font-semibold">{tour.title}</h3>
          <p className="text-xs text-muted-foreground">{tour.objective}</p>
          <ol className="list-decimal space-y-2 pl-5 text-sm marker:text-muted-foreground">
            {tour.steps.map((step, index) => (
              <li key={`${tour.key}:${index}`}>
                <TourStepLink
                  step={step}
                  overview={overview}
                  links={links}
                  onSelectNode={onSelectNode}
                />
                <span className="block text-xs text-muted-foreground">{step.summary}</span>
              </li>
            ))}
          </ol>
        </li>
      ))}
    </ul>
  )
}

function TourStepLink({
  step,
  overview,
  links,
  onSelectNode,
}: {
  step: TourStep
  overview: CourseOverviewDto
  links: CourseLinks
  onSelectNode: (nodeId: string) => void
}) {
  const nodeId = step.nodeId
  if (nodeId !== undefined) {
    return (
      <button
        type="button"
        onClick={() => onSelectNode(nodeId)}
        className="text-left hover:underline focus-visible:-outline-offset-2 pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
      >
        {step.title}
      </button>
    )
  }
  const lessonKey = step.lessonKey
  if (lessonKey !== undefined) {
    return (
      <Link
        href={lessonHref(overview, links, lessonKey)}
        className="hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
      >
        {step.title}
      </Link>
    )
  }
  return <span>{step.title}</span>
}

function lessonHref(overview: CourseOverviewDto, links: CourseLinks, lessonKey: string): string {
  for (const chapter of overview.outline) {
    if (chapter.lessons.some((lesson) => lesson.key === lessonKey)) {
      return links.lesson({ chapterKey: chapter.key, lessonKey })
    }
  }
  return links.overview()
}
