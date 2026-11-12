import type { DashboardSummary } from '@replo/contracts'
import { Card, CardContent, CardHeader, CardTitle } from '@replo/ui'
import { VISIBILITY_LABEL } from '@/features/library/visibility-options'
import { formatCount } from '@/lib/format'

export function LibraryCounts({ counts }: { counts: DashboardSummary['counts'] }) {
  const rows = [
    { label: 'Tutorials', count: counts.total, always: true },
    { label: 'Drafts', count: counts.draft, always: false },
    { label: VISIBILITY_LABEL.public, count: counts.public, always: false },
    { label: VISIBILITY_LABEL.link, count: counts.link, always: false },
    { label: VISIBILITY_LABEL.private, count: counts.private, always: false },
  ].filter((row) => row.always || row.count > 0)

  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle>Library</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="divide-y text-sm">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between py-2 first:pt-0 last:pb-0"
            >
              <dt className="text-muted-foreground">{row.label}</dt>
              <dd className="tabular font-mono">{formatCount(row.count)}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
