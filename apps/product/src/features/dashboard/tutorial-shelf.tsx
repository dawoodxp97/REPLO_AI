'use client'

import type { TutorialSummaryDto } from '@replo/contracts'
import { Badge } from '@replo/ui'
import Link from 'next/link'
import { LinkButton } from '@/components/link-button'
import { SectionHeader } from '@/components/page-header'
import { ReadProgress } from '@/features/library/read-progress'
import { useTutorialList } from '@/features/library/use-library'
import { VISIBILITY_LABEL } from '@/features/library/visibility-options'
import { formatRepoName } from '@/lib/format'
import { pageItems } from '@/lib/paging'
import { tutorialPath } from '@/lib/tutorial-paths'

const SHELF_SIZE = 4

function TutorialCard({ tutorial }: { tutorial: TutorialSummaryDto }) {
  return (
    <li className="flex flex-col gap-4 rounded-lg border bg-card p-4 shadow-xs">
      <div className="space-y-1">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={tutorialPath(tutorial)}
            className="font-medium break-words hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
          >
            {tutorial.title}
          </Link>
          <Badge variant="outline">{VISIBILITY_LABEL[tutorial.visibility]}</Badge>
        </div>
        <p className="font-mono text-xs break-all text-muted-foreground">
          {formatRepoName(tutorial.owner, tutorial.repo)} · v{tutorial.currentVersionNo}
        </p>
      </div>
      <ReadProgress ratio={tutorial.progress} className="w-full flex-1" />
    </li>
  )
}

export function TutorialShelf() {
  const tutorials = useTutorialList()
  const shelf = pageItems(tutorials.data).slice(0, SHELF_SIZE)
  if (shelf.length === 0) return null

  return (
    <section aria-labelledby="shelf-heading" className="space-y-3">
      <SectionHeader
        id="shelf-heading"
        title="Your tutorials"
        action={
          <LinkButton href="/library" variant="ghost" size="sm">
            View library
          </LinkButton>
        }
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {shelf.map((tutorial) => (
          <TutorialCard key={tutorial.id} tutorial={tutorial} />
        ))}
      </ul>
    </section>
  )
}
