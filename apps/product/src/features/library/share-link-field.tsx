'use client'

import { Button, Input, Spinner } from '@replo/ui'
import { Link2 } from 'lucide-react'
import { CopyLinkButton } from '@/components/copy-link-button'
import { ErrorPanel } from '@/components/error-panel'
import type { ShareLinkState } from './use-share-link'

export function ShareLinkField({ link }: { link: ShareLinkState }) {
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
