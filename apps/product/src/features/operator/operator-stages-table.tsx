import type { OperatorJobDetail } from '@replo/contracts'
import { DataTable, type DataColumn } from '@/components/data-table'
import { SectionHeader } from '@/components/page-header'
import { formatDateTime } from '@/lib/format'

type StageRow = OperatorJobDetail['stages'][number]

const COLUMNS: readonly DataColumn<StageRow>[] = [
  { header: 'Stage', cell: (row) => row.stage, className: 'font-mono text-xs' },
  { header: 'Attempt', cell: (row) => row.attempt, className: 'tabular font-mono text-xs' },
  {
    header: 'Finished',
    cell: (row) => (row.finishedAt ? formatDateTime(row.finishedAt) : '—'),
    className: 'text-xs whitespace-nowrap text-muted-foreground',
  },
]

export function OperatorStagesTable({ stages }: { stages: OperatorJobDetail['stages'] }) {
  return (
    <section aria-labelledby="stages-heading" className="space-y-3">
      <SectionHeader
        id="stages-heading"
        title="Stages"
        description="Completed stage checkpoints."
      />
      {stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stage has completed yet.</p>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={stages}
          getKey={(row) => `${row.stage}-${row.attempt}`}
          minWidth="min-w-lg"
        />
      )}
    </section>
  )
}
