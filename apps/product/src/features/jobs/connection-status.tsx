import { cn } from '@replo/ui'
import type { Connection } from './job-progress-state'
import { CONNECTION_LABELS } from './job-status'

const DOT: Record<Connection, string> = {
  connecting: 'bg-muted-foreground/40',
  live: 'bg-observed',
  lost: 'bg-interpretation',
  closed: 'bg-muted-foreground/40',
}

const TEXT: Record<Connection, string> = {
  connecting: 'text-muted-foreground',
  live: 'text-observed-text',
  lost: 'text-interpretation-text',
  closed: 'text-muted-foreground',
}

export function ConnectionStatus({ connection }: { connection: Connection }) {
  return (
    <span
      aria-live="polite"
      className={cn('inline-flex items-center gap-1.5 text-xs font-medium', TEXT[connection])}
    >
      <span aria-hidden className={cn('size-1.5 rounded-full', DOT[connection])} />
      {CONNECTION_LABELS[connection]}
    </span>
  )
}
