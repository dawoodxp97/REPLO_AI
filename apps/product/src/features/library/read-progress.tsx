import { cn, Progress } from '@replo/ui'
import { formatPercent } from '@/lib/format'

export function ReadProgress({ ratio, className }: { ratio: number | null; className?: string }) {
  if (ratio === null) {
    return <span className="text-xs text-muted-foreground">Not started</span>
  }
  return (
    <div className="flex items-center gap-2">
      <Progress value={ratio * 100} aria-label="Read" className={cn('w-16', className)} />
      <span className="tabular font-mono text-xs whitespace-nowrap text-muted-foreground">
        {formatPercent(ratio)} read
      </span>
    </div>
  )
}
