import type { DashboardSummary } from '@replo/contracts'
import { Card } from '@replo/ui'
import { formatCount } from '@/lib/format'

const TILES = [
  { label: 'Tutorials', count: (counts: DashboardSummary['counts']) => counts.total },
  { label: 'Drafts', count: (counts: DashboardSummary['counts']) => counts.draft },
  { label: 'Private', count: (counts: DashboardSummary['counts']) => counts.private },
  { label: 'By link', count: (counts: DashboardSummary['counts']) => counts.link },
  { label: 'Public', count: (counts: DashboardSummary['counts']) => counts.public },
]

export function StatTiles({ counts }: { counts: DashboardSummary['counts'] }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {TILES.map((tile) => (
        <Card key={tile.label} className="gap-1 px-4 py-4">
          <dt className="text-xs text-muted-foreground">{tile.label}</dt>
          <dd className="tabular font-mono text-2xl font-semibold">
            {formatCount(tile.count(counts))}
          </dd>
        </Card>
      ))}
    </dl>
  )
}
