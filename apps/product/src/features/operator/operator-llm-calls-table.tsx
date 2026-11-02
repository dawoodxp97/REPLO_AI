import type { OperatorJobDetail } from '@replo/contracts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@replo/ui'
import { SectionHeader } from '@/components/page-header'
import { PROVIDER_LABELS } from '@/features/keys/providers'
import { formatCount } from '@/lib/format'
import { formatLatency, formatMicros } from './operator-format'

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
        <div className="rounded-lg border bg-card shadow-xs">
          <Table className="min-w-[44rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Stage</TableHead>
                <TableHead scope="col">Provider</TableHead>
                <TableHead scope="col">Model</TableHead>
                <TableHead scope="col">Tokens in / out</TableHead>
                <TableHead scope="col">Latency</TableHead>
                <TableHead scope="col">Cost</TableHead>
                <TableHead scope="col">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {calls.map((call) => (
                <TableRow key={call.id}>
                  <TableCell className="font-mono text-xs">{call.stage}</TableCell>
                  <TableCell>{PROVIDER_LABELS[call.provider]}</TableCell>
                  <TableCell className="font-mono text-xs">{call.model}</TableCell>
                  <TableCell className="tabular font-mono text-xs whitespace-nowrap">
                    {formatCount(call.inputTokens)} / {formatCount(call.outputTokens)}
                  </TableCell>
                  <TableCell className="tabular font-mono text-xs whitespace-nowrap">
                    {formatLatency(call.latencyMs)}
                  </TableCell>
                  <TableCell className="tabular font-mono text-xs whitespace-nowrap">
                    {formatMicros(call.costMicros)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{call.status}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
