import type { DashboardSummary } from '@replo/contracts'
import { VISIBILITY_LABEL } from '@/features/library/visibility-options'
import { formatCount } from '@/lib/format'

export function StatTiles({ counts }: { counts: DashboardSummary['counts'] }) {
  const parts = [
    { label: 'Tutorials', count: counts.total, always: true },
    { label: 'Drafts', count: counts.draft, always: false },
    { label: VISIBILITY_LABEL.public, count: counts.public, always: false },
    { label: VISIBILITY_LABEL.link, count: counts.link, always: false },
    { label: VISIBILITY_LABEL.private, count: counts.private, always: false },
  ].filter((part) => part.always || part.count > 0)

  return (
    <dl aria-label="Your tutorials" className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
      {parts.map((part) => (
        <div key={part.label} className="flex items-baseline gap-2">
          <dt className="text-muted-foreground">{part.label}</dt>
          <dd className="tabular font-mono text-foreground">{formatCount(part.count)}</dd>
        </div>
      ))}
    </dl>
  )
}
