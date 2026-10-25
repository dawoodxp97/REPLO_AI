import { useEffect, useRef } from 'react'

export interface LessonShortcutHandlers {
  next(): void
  previous(): void
  nextReference(): void
  toggleComplete(): void
  openPalette(): void
}

type ActionName = Exclude<keyof LessonShortcutHandlers, 'openPalette'>

const KEY_ACTIONS: Record<string, ActionName | undefined> = {
  n: 'next',
  p: 'previous',
  r: 'nextReference',
  m: 'toggleComplete',
}

export function useLessonShortcuts(handlers: LessonShortcutHandlers) {
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (isTextEntry(event.target)) return

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        latest.current.openPalette()
        return
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return

      const action = KEY_ACTIONS[event.key]
      if (action === undefined) return
      event.preventDefault()
      latest.current[action]()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}
