import { cn } from '@replo/ui'
import { CHECKS } from '@/lib/content'

export function CheckList({ className }: { className?: string }) {
  return (
    <dl className={cn('divide-y overflow-hidden rounded-lg border bg-card', className)}>
      {CHECKS.map((check) => (
        <div
          key={check.name}
          className="grid gap-1 px-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-4"
        >
          <dt className="font-mono text-xs text-foreground">{check.name}</dt>
          <dd className="text-sm leading-relaxed text-muted-foreground">{check.detail}</dd>
        </div>
      ))}
    </dl>
  )
}
