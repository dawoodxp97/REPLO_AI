'use client'

import type { TutorialSummaryDto, Visibility } from '@replo/contracts'
import { Button, Input, Spinner } from '@replo/ui'
import { Link2 } from 'lucide-react'
import { useState } from 'react'
import { CopyLinkButton } from '@/components/copy-link-button'
import { ErrorPanel } from '@/components/error-panel'
import { RadioCardGroup } from '@/components/radio-card-group'
import { useSetVisibility, useShareLink, type ShareLinkState } from './use-library'
import { VISIBILITY_OPTIONS, describeSharingError } from './visibility-options'

export function VisibilityControl({ tutorial }: { tutorial: TutorialSummaryDto }) {
  const setVisibility = useSetVisibility()
  const shareLink = useShareLink(tutorial.id)
  const [chosen, setChosen] = useState<Visibility | null>(null)
  const current = chosen ?? tutorial.visibility

  function choose(visibility: Visibility) {
    setChosen(visibility)
    setVisibility.mutate(
      { tutorialId: tutorial.id, visibility },
      {
        onSettled: () => setChosen(null),
        onSuccess: () => {
          if (visibility === 'link') shareLink.create()
          else shareLink.clear()
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <fieldset disabled={setVisibility.isPending} className="contents">
        <RadioCardGroup
          name={`visibility-${tutorial.id}`}
          legend="Visibility"
          options={VISIBILITY_OPTIONS}
          value={current}
          onChange={choose}
        />
      </fieldset>
      {current === 'link' ? <ShareLinkField link={shareLink} /> : null}
      {setVisibility.isError ? (
        <ErrorPanel
          title="Visibility was not changed"
          description={describeSharingError(setVisibility.error)}
        />
      ) : null}
    </div>
  )
}

function ShareLinkField({ link }: { link: ShareLinkState }) {
  return (
    <div className="space-y-3">
      {link.url ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            readOnly
            aria-label="Share link"
            value={link.url}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <CopyLinkButton url={link.url} />
        </div>
      ) : (
        <Button variant="outline" size="sm" disabled={link.isPending} onClick={link.create}>
          {link.isPending ? <Spinner /> : <Link2 />}
          Get share link
        </Button>
      )}
      {link.isError ? (
        <ErrorPanel
          title="The share link could not be created"
          description="Check your connection, then try again."
        />
      ) : null}
    </div>
  )
}
