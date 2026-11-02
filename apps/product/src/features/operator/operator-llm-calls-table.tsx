import type { OperatorJobDetail } from '@replo/contracts'
import { DataTable, type DataColumn } from '@/components/data-table'
import { SectionHeader } from '@/components/page-header'
import { LLM_PROVIDER_LABELS } from '@/features/keys/providers'
import { formatCount, formatLatency, formatMicros } from '@/lib/format'

type CallRow = OperatorJobDetail['llmCalls'][number]

const NUMERIC = 'tabular font-mono text-xs whitespace-nowrap'

const COLUMNS: readonly DataColumn<CallRow>[] = [
  { header: 'Stage', cell: (row) => row.stage, className: 'font-mono text-xs' },
  { header: 'Provider', cell: (row) => LLM_PROVIDER_LABELS[row.provider] },
  { header: 'Model', cell: (row) => row.model, className: 'font-mono text-xs' },
  {
    header: 'Tokens in / out',
    cell: (row) => `${formatCount(row.inputTokens)} / ${formatCount(row.outputTokens)}`,
    className: NUMERIC,
  },
  { header: 'Latency', cell: (row) => formatLatency(row.latencyMs), className: NUMERIC },
  { header: 'Cost', cell: (row) => formatMicros(row.costMicros), className: NUMERIC },
  { header: 'Status', cell: (row) => row.status, className: 'font-mono text-xs' },
]

export function OperatorLlmCallsTable({ calls }: { calls: OperatorJobDetail['llmCalls'] }) {
  return (
    <section aria-labelledby="calls-heading" className="space-y-3">
      <SectionHeader
        id="calls-heading"
        title="Model calls"
        description="Every provider call this job made, with its cost."
      />
      {calls.length === 0 ? (
        <p className="text-sm text-muted-foreground">This job has not called a model yet.</p>
      ) : (
        <DataTable columns={COLUMNS} rows={calls} getKey={(row) => row.id} minWidth="min-w-2xl" />
      )}
    </section>
  )
}
