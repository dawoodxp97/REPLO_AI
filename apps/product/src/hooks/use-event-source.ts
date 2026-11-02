'use client'

import { useEffect, useRef } from 'react'

export interface EventSourceOptions {
  url: string
  events: readonly string[]
  enabled?: boolean
  onMessage: (data: string) => void
  onOpen?: () => void
  onError?: () => void
}

export function useEventSource({
  url,
  events,
  enabled = true,
  onMessage,
  onOpen,
  onError,
}: EventSourceOptions) {
  const handlers = useRef({ onMessage, onOpen, onError })
  useEffect(() => {
    handlers.current = { onMessage, onOpen, onError }
  })
  const eventsKey = events.join(',')

  useEffect(() => {
    if (!enabled) return
    let source: EventSource | undefined

    const open = () => {
      const next = new EventSource(url, { withCredentials: true })
      next.onopen = () => handlers.current.onOpen?.()
      next.onerror = () => handlers.current.onError?.()
      for (const type of eventsKey.split(',')) {
        next.addEventListener(type, (message) => {
          handlers.current.onMessage((message as MessageEvent<string>).data)
        })
      }
      source = next
    }

    const close = () => {
      source?.close()
      source = undefined
    }

    const sync = () => {
      if (document.visibilityState === 'hidden') close()
      else if (!source) open()
    }

    sync()
    document.addEventListener('visibilitychange', sync)
    return () => {
      document.removeEventListener('visibilitychange', sync)
      close()
    }
  }, [url, enabled, eventsKey])
}
