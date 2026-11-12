export type ShortcutAction = 'next' | 'previous' | 'nextReference' | 'toggleComplete' | 'palette'

export interface ShortcutHint {
  keys: readonly string[]
  label: string
}

export interface ShortcutEvent {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  altKey: boolean
  repeat: boolean
  inTextEntry: boolean
  inDialog: boolean
}

export const COMMAND_PALETTE_KEYS = ['Ctrl/⌘', 'K'] as const

export const LESSON_SHORTCUTS: Record<Exclude<ShortcutAction, 'palette'>, ShortcutHint> = {
  next: { keys: ['n'], label: 'Next lesson' },
  previous: { keys: ['p'], label: 'Previous lesson' },
  nextReference: { keys: ['r'], label: 'Next source reference' },
  toggleComplete: { keys: ['m'], label: 'Mark complete' },
}

export const LESSON_SHORTCUT_HINTS: readonly ShortcutHint[] = [
  ...Object.values(LESSON_SHORTCUTS),
  { keys: COMMAND_PALETTE_KEYS, label: 'Commands' },
]

const LETTER_ACTIONS = new Map(
  Object.entries(LESSON_SHORTCUTS).flatMap(([action, hint]) =>
    hint.keys.map((key) => [key, action as ShortcutAction] as const),
  ),
)

export function resolveShortcut(event: ShortcutEvent): ShortcutAction | null {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') return 'palette'
  if (event.metaKey || event.ctrlKey || event.altKey) return null
  if (event.inTextEntry || event.inDialog || event.repeat) return null
  return LETTER_ACTIONS.get(event.key) ?? null
}
