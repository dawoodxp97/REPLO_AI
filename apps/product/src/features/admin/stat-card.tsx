import { cn } from '@replo/ui'
import type { ReactNode } from 'react'

const TONE: Record<'destructive', string> = {
  destructive: 'text-destructive',
}

export function StatCard({
  label,
  value,
  tone,
}: {
  label: string
  value: ReactNode
  tone?: 'destructive'
}) {
  return (
    <div className="rounded-lg border bg-card px-5 py-4 shadow-xs">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={cn('mt-1 text-2xl font-semibold tabular-nums', tone && TONE[tone])}>
        {value}
      </dd>
    </div>
  )
}