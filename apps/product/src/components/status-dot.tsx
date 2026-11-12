import { cn } from '@replo/ui'

export type StatusTone = 'ready' | 'attention' | 'neutral'

const TONE_CLASS: Record<StatusTone, string> = {
  ready: 'bg-observed',
  attention: 'bg-interpretation',
  neutral: 'bg-muted-foreground/40',
}

export function StatusDot({ tone, className }: { tone: StatusTone; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn('size-1.5 shrink-0 rounded-full', TONE_CLASS[tone], className)}
    />
  )
}
