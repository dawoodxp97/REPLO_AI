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
    <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
      {parts.map((part) => (
        <div key={part.label} className="flex items-baseline gap-1.5">
          <dd className="tabular font-mono font-semibold text-foreground">
            {formatCount(part.count)}
          </dd>
          <dt>{part.label}</dt>
        </div>
      ))}
    </dl>
  )
}
