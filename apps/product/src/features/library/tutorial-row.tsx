'use client'

import type { TutorialSummaryDto } from '@replo/contracts'
import { Badge } from '@replo/ui'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { tutorialPath } from '@/lib/tutorial-paths'
import { VisibilityControl } from './visibility-control'
import { useDeleteTutorial } from './use-library'

export function TutorialRow({ tutorial }: { tutorial: TutorialSummaryDto }) {
  const remove = useDeleteTutorial()
  const readPercent = tutorial.progress === null ? null : Math.round(tutorial.progress * 100)

  return (
    <li className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <Link
            href={tutorialPath(tutorial)}
            className="font-serif text-lg font-medium break-words hover:text-primary"
          >
            {tutorial.title}
          </Link>
          <p className="font-mono text-xs text-muted-foreground">
            {tutorial.owner}/{tutorial.repo} · version {tutorial.currentVersionNo} · updated{' '}
            {tutorial.updatedAt.slice(0, 10)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>{tutorial.visibility}</Badge>
          {readPercent !== null ? <Badge variant="observed">{readPercent}% read</Badge> : null}
        </div>
      </div>

      <details>
        <summary className="cursor-pointer text-sm text-primary underline underline-offset-4">
          Sharing
        </summary>
        <div className="pt-4">
          <VisibilityControl tutorial={tutorial} />
        </div>
      </details>

      <div className="flex justify-end">
        <ConfirmDialog
          triggerLabel="Delete"
          title="Delete this tutorial?"
          description="Its versions and your progress are deleted. Public and link URLs for it stop working."
          confirmLabel="Delete tutorial"
          run={() => remove.mutateAsync({ tutorialId: tutorial.id })}
          describeError={() => 'The tutorial could not be deleted. Try again.'}
        />
      </div>
    </li>
  )
}
