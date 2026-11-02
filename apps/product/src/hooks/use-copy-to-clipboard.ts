import { useCallback, useEffect, useRef, useState } from 'react'

export type CopyStatus = 'idle' | 'copied' | 'failed'

const RESET_MS = 2000

interface CopyState {
  text: string
  status: CopyStatus
}

export function useCopyToClipboard(text: string) {
  const [state, setState] = useState<CopyState>({ text, status: 'idle' })
  const timer = useRef<number | undefined>(undefined)
  const status = state.text === text ? state.status : 'idle'

  useEffect(() => () => window.clearTimeout(timer.current), [text])

  const copy = useCallback(async () => {
    window.clearTimeout(timer.current)
    let outcome: CopyStatus
    try {
      await navigator.clipboard.writeText(text)
      outcome = 'copied'
    } catch {
      outcome = 'failed'
    }
    setState({ text, status: outcome })
    timer.current = window.setTimeout(() => setState({ text, status: 'idle' }), RESET_MS)
  }, [text])

  return { status, copy }
}
