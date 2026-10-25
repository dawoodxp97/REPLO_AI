'use client'

import type { TutorialSummaryDto, Visibility } from '@replo/contracts'
import { Alert, Input } from '@replo/ui'
import { useState } from 'react'
import { CopyLinkButton } from '@/components/copy-link-button'
import { apiErrorDetails } from '@/lib/api-error'
import { useCreateShareLink, useSetVisibility } from './use-library'

const VISIBILITY_OPTIONS: readonly { value: Visibility; title: string; hint: string }[] = [
  { value: 'private', title: 'Private', hint: 'Only you can read it.' },
  { value: 'link', title: 'Link', hint: 'Anyone with the link can read it.' },
  { value: 'public', title: 'Public', hint: 'Listed for everyone. Needs an open-source licence.' },
]

export function VisibilityControl({ tutorial }: { tutorial: TutorialSummaryDto }) {
  const setVisibility = useSetVisibility()
  const createShareLink = useCreateShareLink()
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Visibility | null>(null)
  const groupName = `visibility-${tutorial.id}`
  const current = chosen ?? tutorial.visibility

  function choose(visibility: Visibility) {
    setChosen(visibility)
    setVisibility.mutate(
      { tutorialId: tutorial.id, visibility },
      {
        onError: () => setChosen(null),
        onSuccess: () => {
          if (visibility !== 'link') {
            setShareUrl(null)
            return
          }
          createShareLink.mutate(
            { tutorialId: tutorial.id },
            { onSuccess: (link) => setShareUrl(link.url) },
          )
        },
      },
    )
  }

  return (
    <fieldset disabled={setVisibility.isPending} className="space-y-3 text-sm">
      <legend className="mb-2 font-medium">Visibility</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {VISIBILITY_OPTIONS.map((option) => (
          <label
            key={option.value}
            className="flex cursor-pointer flex-col gap-1 rounded-md border border-border p-3 has-[:checked]:border-primary has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
          >
            <span className="flex items-center gap-2 font-medium">
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={current === option.value}
                onChange={() => choose(option.value)}
                className="size-4 accent-primary"
              />
              {option.title}
            </span>
            <span className="text-xs text-muted-foreground">{option.hint}</span>
          </label>
        ))}
      </div>

      {shareUrl ? (
        <div className="flex flex-wrap items-center gap-2">
          <Input
            readOnly
            aria-label="Share link"
            value={shareUrl}
            className="min-w-0 flex-1 font-mono text-xs"
          />
          <CopyLinkButton url={shareUrl} />
        </div>
      ) : null}

      {setVisibility.isError ? (
        <Alert tone="destructive" role="alert">
          {describeSharingError(setVisibility.error)}
        </Alert>
      ) : null}
      {createShareLink.isError ? (
        <Alert tone="destructive" role="alert">
          The share link could not be created. Try again.
        </Alert>
      ) : null}
    </fieldset>
  )
}

function describeSharingError(error: unknown): string {
  const details = apiErrorDetails(error)
  if (details?.code === 'PUBLIC_REQUIRES_OPEN_LICENSE') {
    return 'Public tutorials need an open-source licence in the repository. Private and link sharing still work.'
  }
  return 'The visibility could not be changed. Try again.'
}
