import type { OperatorJobDetail, OperatorJobRow } from '@replo/contracts'
import { Badge, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@replo/ui'
import Link from 'next/link'
import { formatUsd } from '@/lib/format'
import { MICROS_PER_USD } from '@replo/contracts'

const COLUMNS = ['Job', 'Status', 'Stage', 'Pipeline', 'Progress', 'Spent', 'Created'] as const

export function OperatorJobsTable({
  rows,
  nextCursor,
}: {
  rows: readonly OperatorJobRow[]
  nextCursor: string | null
}) {
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[48rem] text-left text-sm">
          <thead className="border-b border-border text-xs text-muted-foreground">
            <tr>
              {COLUMNS.map((column) => (
                <th key={column} scope="col" className="px-3 py-2 font-medium">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((row) => (
              <tr key={row.jobId}>
                <td className="px-3 py-2 font-mono text-xs">
                  <Link
                    href={`/operator/jobs/${row.jobId}`}
                    className="text-primary underline underline-offset-4"
                  >
                    {row.jobId.slice(0, 8)}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <Badge>{row.status}</Badge>
                </td>
                <td className="px-3 py-2">{row.stage ?? '—'}</td>
                <td className="px-3 py-2">{row.pipeline}</td>
                <td className="px-3 py-2 tabular-nums">{row.progress}%</td>
                <td className="px-3 py-2 tabular-nums">
                  {formatUsd(row.spentMicros / MICROS_PER_USD)} of{' '}
                  {formatUsd(row.budgetMicros / MICROS_PER_USD)}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {row.createdAt.slice(0, 16).replace('T', ' ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {nextCursor ? (
        <Link
          href={`/operator?cursor=${encodeURIComponent(nextCursor)}`}
          className="text-sm text-primary underline underline-offset-4"
        >
          Next page
        </Link>
      ) : null}
    </div>
  )
}

export function OperatorJobDetailView({ detail }: { detail: OperatorJobDetail }) {
  const job = detail.job
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardDescription className="font-mono">{job.jobId}</CardDescription>
          <CardTitle className="text-base">
            {job.status} · {job.pipeline} pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm sm:grid-cols-3">
          <p>Stage: {job.stage ?? '—'}</p>
          <p>Attempts: {job.attempts}</p>
          <p>
            Spent {formatUsd(job.spentMicros / MICROS_PER_USD)} of{' '}
            {formatUsd(job.budgetMicros / MICROS_PER_USD)}
          </p>
          <p className="sm:col-span-3 text-muted-foreground">
            Error: {job.errorCode ?? 'none'}
            {job.errorMessage ? ` · ${job.errorMessage}` : ''}
          </p>
        </CardContent>
      </Card>

      <section aria-labelledby="stages-heading" className="space-y-2">
        <h2 id="stages-heading" className="font-serif text-xl font-medium">
          Stages
        </h2>
        <ol className="space-y-1 text-sm">
          {detail.stages.map((stage) => (
            <li key={stage.stage}>
              {stage.stage} · attempt {stage.attempt}
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="calls-heading" className="space-y-2">
        <h2 id="calls-heading" className="font-serif text-xl font-medium">
          Model calls
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b border-border text-xs text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 font-medium">
                  Stage
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Model
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Tokens in / out
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Cost
                </th>
                <th scope="col" className="px-3 py-2 font-medium">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {detail.llmCalls.map((call) => (
                <tr key={call.id}>
                  <td className="px-3 py-2">{call.stage}</td>
                  <td className="px-3 py-2 font-mono text-xs">{call.model}</td>
                  <td className="px-3 py-2 tabular-nums">
                    {call.inputTokens} / {call.outputTokens}
                  </td>
                  <td className="px-3 py-2 tabular-nums">
                    {formatUsd(call.costMicros / MICROS_PER_USD)}
                  </td>
                  <td className="px-3 py-2">{call.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
