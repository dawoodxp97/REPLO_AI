import type { DashboardSummary } from '@replo/contracts'
import { VISIBILITY_LABEL } from '@/features/library/visibility-options'
import { formatCount } from '@/lib/format'

export function StatTiles({ counts }: { counts: DashboardSummary['counts'] }) {
  const parts = [
    { label: 'Tutorials', count: counts.total },
    { label: 'Drafts', count: counts.draft },
    { label: VISIBILITY_LABEL.private, count: counts.private },
    { label: VISIBILITY_LABEL.link, count: counts.link },
    { label: VISIBILITY_LABEL.public, count: counts.public },
  ]

  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-lg border bg-card sm:grid-cols-5">
      {parts.map((part) => (
        <div key={part.label} className="flex flex-col gap-2 px-5 py-4">
          <dt className="text-xs text-muted-foreground">{part.label}</dt>
          <dd className="tabular font-mono text-2xl font-medium tracking-tight text-foreground">
            {formatCount(part.count)}
          </dd>
        </div>
      ))}
    </dl>
  )
}
