'use client'

import type { TutorialSummaryDto } from '@replo/contracts'
import {
  Badge,
  Button,
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemTitle,
} from '@replo/ui'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { formatDate, formatRepoName } from '@/lib/format'
import { tutorialPath } from '@/lib/tutorial-paths'
import { ReadProgress } from './read-progress'
import { useDeleteTutorial } from './use-library'
import { VisibilityControl } from './visibility-control'
import { VISIBILITY_LABEL } from './visibility-options'

export function TutorialRow({ tutorial }: { tutorial: TutorialSummaryDto }) {
  const remove = useDeleteTutorial()

  return (
    <Collapsible render={<Item />}>
      <ItemContent className="basis-full sm:basis-0">
        <ItemTitle>
          <Link
            href={tutorialPath(tutorial)}
            className="break-words hover:underline pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center"
          >
            {tutorial.title}
          </Link>
        </ItemTitle>
        <ItemDescription className="font-mono text-xs">
          {formatRepoName(tutorial.owner, tutorial.repo)} · v{tutorial.currentVersionNo} · updated{' '}
          {formatDate(tutorial.updatedAt)}
        </ItemDescription>
      </ItemContent>
      <ItemActions className="max-w-full flex-wrap">
        <Badge variant="outline">{VISIBILITY_LABEL[tutorial.visibility]}</Badge>
        {tutorial.progress === null ? null : <ReadProgress ratio={tutorial.progress} />}
        <CollapsibleTrigger
          render={<Button variant="ghost" size="sm" />}
          className="[&[data-panel-open]>svg]:rotate-180"
        >
          Sharing
          <ChevronDown className="transition-transform" />
        </CollapsibleTrigger>
        <ConfirmDialog
          triggerLabel="Delete"
          title="Delete this tutorial?"
          description="Its versions and your progress are deleted. Public and link URLs for it stop working."
          confirmLabel="Delete tutorial"
          run={() => remove.mutateAsync({ tutorialId: tutorial.id })}
          describeError={() => 'The tutorial could not be deleted. Try again.'}
        />
      </ItemActions>
      <CollapsibleContent className="basis-full border-t pt-4">
        <VisibilityControl tutorial={tutorial} />
      </CollapsibleContent>
    </Collapsible>
  )
}
