import { useEffect, useRef } from 'react'
import { resolveShortcut, type ShortcutAction } from './shortcut-resolver'

export type LessonShortcutHandlers = Record<ShortcutAction, () => void>

const TEXT_ENTRY_TAGS = ['INPUT', 'TEXTAREA', 'SELECT']
const DIALOG_SELECTOR = '[role="dialog"],[role="alertdialog"]'

export function useLessonShortcuts(handlers: LessonShortcutHandlers) {
  const latest = useRef(handlers)

  useEffect(() => {
    latest.current = handlers
  })

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const action = resolveShortcut({
        key: event.key,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        altKey: event.altKey,
        repeat: event.repeat,
        inTextEntry: isTextEntry(event.target),
        inDialog: isInsideDialog(event.target),
      })
      if (action === null) return
      event.preventDefault()
      latest.current[action]()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || TEXT_ENTRY_TAGS.includes(target.tagName)
}

function isInsideDialog(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest(DIALOG_SELECTOR) !== null
}
