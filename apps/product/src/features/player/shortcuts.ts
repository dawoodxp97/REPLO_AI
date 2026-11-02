export interface ShortcutHint {
  keys: readonly string[]
  label: string
}

export const COMMAND_PALETTE_KEYS = ['Ctrl/⌘', 'K'] as const

export const LESSON_SHORTCUTS: Record<
  'next' | 'previous' | 'nextReference' | 'toggleComplete',
  ShortcutHint
> = {
  next: { keys: ['n'], label: 'Next lesson' },
  previous: { keys: ['p'], label: 'Previous lesson' },
  nextReference: { keys: ['r'], label: 'Next source reference' },
  toggleComplete: { keys: ['m'], label: 'Mark complete' },
}

export const LESSON_SHORTCUT_HINTS: readonly ShortcutHint[] = [
  ...Object.values(LESSON_SHORTCUTS),
  { keys: COMMAND_PALETTE_KEYS, label: 'Commands' },
]
