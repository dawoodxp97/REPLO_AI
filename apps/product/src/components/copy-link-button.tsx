'use client'

import { Button } from '@replo/ui'
import { useState } from 'react'

type CopyState = 'idle' | 'copied' | 'failed'

const LABEL: Record<CopyState, string> = {
  idle: 'Copy link',
  copied: 'Link copied',
  failed: 'Copy failed. Select the link instead.',
}

export function CopyLinkButton({ url }: { url: string }) {
  const [state, setState] = useState<CopyState>('idle')

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setState('copied')
    } catch {
      setState('failed')
    }
  }

  return (
    <Button variant="outline" size="sm" onClick={() => void copy()} aria-live="polite">
      {LABEL[state]}
    </Button>
  )
}
