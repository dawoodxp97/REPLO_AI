import { Button } from '@replo/ui'
import type { LineWindow } from './line-window'

export interface WindowControlsProps {
  total: number
  view: LineWindow
  onMove: (direction: 'up' | 'down') => void
}

export function WindowControls({ total, view, onMove }: WindowControlsProps) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
      <Button variant="outline" size="xs" disabled={view.from === 0} onClick={() => onMove('up')}>
        Earlier lines
      </Button>
      <span className="font-mono tabular">
        Lines {view.from + 1}–{view.to} of {total}
      </span>
      <Button
        variant="outline"
        size="xs"
        disabled={view.to >= total}
        onClick={() => onMove('down')}
      >
        Later lines
      </Button>
    </div>
  )
}
