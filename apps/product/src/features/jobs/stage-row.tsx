import { cn } from '@replo/ui'
import { Check, Circle, LoaderCircle, X, type LucideIcon } from 'lucide-react'
import type { Stage } from '@replo/contracts'
import { formatElapsed } from './format-elapsed'
import type { StageState, StageTiming } from './job-progress-state'
import { STAGE_LABELS, STAGE_STATE_LABELS } from './job-status'

const ICONS: Record<StageState, LucideIcon> = {
  pending: Circle,
  running: LoaderCircle,
  done: Check,
  failed: X,
}

const ICON_CLASS: Record<StageState, string> = {
  pending: 'text-muted-foreground/40',
  running: 'animate-spin text-foreground motion-reduce:animate-none',
  done: 'text-observed-text',
  failed: 'text-destructive',
}

const LABEL_CLASS: Record<StageState, string> = {
  pending: 'text-muted-foreground',
  running: 'font-medium',
  done: '',
  failed: 'font-medium text-destructive',
}

function elapsedLabel(state: StageState, timing: StageTiming, now: number): string | null {
  if (timing.startedAt === null) return null
  if (state === 'running') return formatElapsed(now - timing.startedAt)
  if (timing.endedAt === null) return null
  return formatElapsed(timing.endedAt - timing.startedAt)
}

export function StageRow({
  stage,
  state,
  timing,
  now,
  isLast,
}: {
  stage: Stage
  state: StageState
  timing: StageTiming
  now: number
  isLast: boolean
}) {
  const Icon = ICONS[state]
  const elapsed = elapsedLabel(state, timing, now)

  return (
    <li className={cn('relative flex items-start gap-3 text-sm', isLast ? '' : 'pb-5')}>
      {isLast ? null : (
        <span
          aria-hidden
          className="absolute top-5 bottom-0 left-2 w-px -translate-x-1/2 bg-border"
        />
      )}
      <span className="relative flex size-4 shrink-0 items-center justify-center bg-card py-0.5">
        <Icon aria-hidden className={cn('size-4', ICON_CLASS[state])} />
      </span>
      <span className={cn('min-w-0 flex-1 leading-snug', LABEL_CLASS[state])}>
        {STAGE_LABELS[stage]}
      </span>
      <span className="flex shrink-0 items-baseline gap-3 text-xs text-muted-foreground">
        {elapsed ? <span className="tabular font-mono">{elapsed}</span> : null}
        <span className="w-14 text-right">{STAGE_STATE_LABELS[state]}</span>
      </span>
    </li>
  )
}
