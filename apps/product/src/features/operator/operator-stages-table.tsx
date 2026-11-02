import type { OperatorJobDetail } from '@replo/contracts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@replo/ui'
import { SectionHeader } from '@/components/page-header'
import { formatDateTime } from './operator-format'

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
        <div className="rounded-lg border bg-card shadow-xs">
          <Table className="min-w-[28rem]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Stage</TableHead>
                <TableHead scope="col">Attempt</TableHead>
                <TableHead scope="col">Finished</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stages.map((stage) => (
                <TableRow key={`${stage.stage}-${stage.attempt}`}>
                  <TableCell className="font-mono text-xs">{stage.stage}</TableCell>
                  <TableCell className="tabular font-mono text-xs">{stage.attempt}</TableCell>
                  <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                    {stage.finishedAt ? formatDateTime(stage.finishedAt) : '—'}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  )
}
