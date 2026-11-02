'use client'

import { Button, cn } from '@replo/ui'
import { Check, Copy } from 'lucide-react'
import { useCopyToClipboard, type CopyStatus } from '@/hooks/use-copy-to-clipboard'

const ANNOUNCEMENT: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Link copied',
  failed: 'Copy failed. Select the link and copy it by hand.',
}

export function CopyLinkButton({ url }: { url: string }) {
  const { status, copy } = useCopyToClipboard(url)

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => void copy()}>
        {status === 'copied' ? <Check className="text-observed-text" /> : <Copy />}
        Copy link
      </Button>
      <span
        role="status"
        aria-live="polite"
        className={cn(status === 'failed' ? 'text-xs text-destructive' : 'sr-only')}
      >
        {ANNOUNCEMENT[status]}
      </span>
    </>
  )
}
