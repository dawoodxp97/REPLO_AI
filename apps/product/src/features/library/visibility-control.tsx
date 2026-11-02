'use client'

import type { TutorialSummaryDto, Visibility } from '@replo/contracts'
import { useState } from 'react'
import { ErrorPanel } from '@/components/error-panel'
import { RadioCardGroup } from '@/components/radio-card-group'
import { ShareLinkField } from './share-link-field'
import { useSetVisibility } from './use-library'
import { useShareLink } from './use-share-link'
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
