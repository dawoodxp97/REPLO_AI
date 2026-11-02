export type ShortcutAction = 'next' | 'previous' | 'nextReference' | 'toggleComplete' | 'palette'

export interface ShortcutEvent {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  repeat: boolean
  inTextEntry: boolean
  inDialog: boolean
}

const LETTER_ACTIONS: Record<string, ShortcutAction | undefined> = {
  n: 'next',
  p: 'previous',
  r: 'nextReference',
  m: 'toggleComplete',
}

export function resolveShortcut(event: ShortcutEvent): ShortcutAction | null {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') return 'palette'
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.inTextEntry || event.inDialog || event.repeat) return null
  return LETTER_ACTIONS[event.key] ?? null
}
