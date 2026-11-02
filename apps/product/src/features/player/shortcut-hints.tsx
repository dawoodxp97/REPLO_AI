import { Kbd } from '@replo/ui'
import { LESSON_SHORTCUT_HINTS } from './shortcuts'

export function ShortcutHints() {
  return (
    <ul
      aria-label="Keyboard shortcuts"
      className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
    >
      {LESSON_SHORTCUT_HINTS.map((hint) => (
        <li key={hint.label} className="flex items-center gap-1.5">
          <span className="flex items-center gap-1">
            {hint.keys.map((key) => (
              <Kbd key={key}>{key}</Kbd>
            ))}
          </span>
          {hint.label}
        </li>
      ))}
    </ul>
  )
}
