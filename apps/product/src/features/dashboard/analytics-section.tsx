'use client'

import type {
  AnalyticsGranularity,
  AnalyticsQuery,
  AnalyticsReport,
  SavedDashboard,
} from '@replo/contracts'
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  FormField,
  Input,
  Skeleton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  ToggleGroup,
  ToggleGroupItem,
} from '@replo/ui'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { InlineError } from '@/components/inline-error'
import { SectionHeader } from '@/components/page-header'
import { QueryBoundary } from '@/components/query-boundary'
import { useIsVisible } from '@/hooks/use-is-visible'
import { formatElapsed } from '@/features/jobs/format-elapsed'
import { formatPercent } from '@/lib/format'
import { pageItems } from '@/lib/paging'
import { createErrorDescriber } from '@/lib/error-copy'
import { analyticsQueryFor, GRANULARITY_LABELS, isoDateInZone } from './analytics-range'
import { ModelUsageChart, TimelineChart } from './analytics-chart'
import {
  useAnalytics,
  useDeleteDashboard,
  useSaveDashboard,
  useSavedDashboards,
} from './use-analytics'
import { useTimeZone } from './use-time-zone'

const GRANULARITIES: AnalyticsGranularity[] = ['day', 'week', 'month']
const DEFAULT_DAYS = 90
const CHART_HEIGHT = 'h-64'

const describeSaveError = createErrorDescriber({
  DASHBOARD_NAME_TAKEN: 'A saved dashboard already uses that name.',
  BAD_REQUEST: 'Give the dashboard a name of 80 characters or fewer.',
})

export function AnalyticsSection() {
  const timeZone = useTimeZone()
  const [query, setQuery] = useState<AnalyticsQuery | null>(null)
  const effective = query ?? analyticsQueryFor(DEFAULT_DAYS, 'day', timeZone)
  const report = useAnalytics(effective)
  const saved = useSavedDashboards()

  useSavedDashboardSelection(saved.data, setQuery)

  return (
    <section aria-labelledby="analytics-heading" className="space-y-4">
      <SectionHeader
        id="analytics-heading"
        title="Analytics"
        description="Generation and reading activity, bucketed in your time zone."
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="min-w-0 space-y-6">
          <Controls query={effective} timeZone={timeZone} onChange={setQuery} />
          <QueryBoundary
            query={report}
            errorTitle="Analytics could not be loaded"
            loading={<Skeleton aria-busy="true" className="h-64 w-full" />}
          >
            {(data) => (
              <div className="space-y-6">
                <SummaryCards report={data} />
                <Card>
                  <CardHeader>
                    <CardTitle as="h3">Activity</CardTitle>
                    <CardDescription>
                      Counts per {GRANULARITY_LABELS[data.query.granularity].toLowerCase()}.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LazyChart height={CHART_HEIGHT}>
                      <TimelineChart series={data.series} label="Activity over time" />
                    </LazyChart>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle as="h3">Models</CardTitle>
                    <CardDescription>Generations run per model in this range.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <LazyChart height="h-32">
                      <ModelUsageChart models={data.models} />
                    </LazyChart>
                  </CardContent>
                </Card>
              </div>
            )}
          </QueryBoundary>
        </div>
        <SavedDashboards query={effective} saved={saved} />
      </div>
    </section>
  )
}

function Controls({
  query,
  timeZone,
  onChange,
}: {
  query: AnalyticsQuery
  timeZone: string
  onChange: (query: AnalyticsQuery) => void
}) {
  const today = isoDateInZone(new Date(), timeZone)

  function changeRange(days: number) {
    onChange(analyticsQueryFor(days, query.granularity, timeZone))
  }

  return (
    <div
      role="group"
      aria-label="Analytics filters"
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3 shadow-xs"
    >
      <FormField id="analytics-from" label="From" className="w-40">
        <Input
          id="analytics-from"
          type="date"
          value={query.from}
          max={query.to}
          onChange={(event) =>
            onChange({
              ...query,
              from: event.target.value === '' ? query.from : event.target.value,
            })
          }
        />
      </FormField>
      <FormField id="analytics-to" label="To" className="w-40">
        <Input
          id="analytics-to"
          type="date"
          value={query.to}
          min={query.from}
          max={today}
          onChange={(event) =>
            onChange({
              ...query,
              to: event.target.value === '' ? query.to : event.target.value,
            })
          }
        />
      </FormField>
      <div className="space-y-2">
        <p className="text-sm font-medium">Bucket</p>
        <ToggleGroup
          aria-label="Bucket size"
          value={[query.granularity]}
          onValueChange={([next]) => {
            if (next === 'day' || next === 'week' || next === 'month') {
              onChange({ ...query, granularity: next })
            }
          }}
        >
          {GRANULARITIES.map((granularity) => (
            <ToggleGroupItem key={granularity} value={granularity}>
              {GRANULARITY_LABELS[granularity]}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="ml-auto flex flex-wrap gap-2">
        {[30, 90, 365].map((days) => (
          <Button key={days} variant="outline" size="sm" onClick={() => changeRange(days)}>
            {days === 365 ? '12 months' : `${days} days`}
          </Button>
        ))}
      </div>
    </div>
  )
}

function SummaryCards({ report }: { report: AnalyticsReport }) {
  const { summary } = report
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Card className="gap-2">
        <CardHeader>
          <CardDescription>Success rate</CardDescription>
          <CardTitle as="h3" className="text-2xl">
            {summary.successRate === null ? '—' : formatPercent(summary.successRate)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {summary.jobsSucceeded} finished · {summary.jobsFailed} failed
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardHeader>
          <CardDescription>Median time to ready</CardDescription>
          <CardTitle as="h3" className="text-2xl">
            {summary.medianTimeToReadySeconds === null
              ? '—'
              : formatElapsed(summary.medianTimeToReadySeconds * 1000)}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          From start to published.
        </CardContent>
      </Card>
      <Card className="gap-2">
        <CardHeader>
          <CardDescription>Generations</CardDescription>
          <CardTitle as="h3" className="text-2xl">
            {summary.jobsSucceeded + summary.jobsFailed}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          {report.models.length === 0
            ? 'No model usage yet.'
            : `${report.models.length} models used.`}
        </CardContent>
      </Card>
      <details className="sm:col-span-3">
        <summary className="cursor-pointer text-sm text-muted-foreground pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center">
          Show the summary as a table
        </summary>
        <div className="mt-2 overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Metric</TableHead>
                <TableHead scope="col" className="text-right">
                  Value
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell>Success rate</TableCell>
                <TableCell className="tabular text-right font-mono">
                  {summary.successRate === null ? '—' : formatPercent(summary.successRate)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Median time to ready</TableCell>
                <TableCell className="tabular text-right font-mono">
                  {summary.medianTimeToReadySeconds === null
                    ? '—'
                    : formatElapsed(summary.medianTimeToReadySeconds * 1000)}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Generations finished</TableCell>
                <TableCell className="tabular text-right font-mono">
                  {summary.jobsSucceeded}
                </TableCell>
              </TableRow>
              <TableRow>
                <TableCell>Generations failed</TableCell>
                <TableCell className="tabular text-right font-mono">{summary.jobsFailed}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </details>
    </div>
  )
}

function LazyChart({ height, children }: { height: string; children: ReactNode }) {
  const [ref, visible] = useIsVisible()
  return (
    <div ref={ref} className={height}>
      {visible ? children : <Skeleton aria-busy="true" className="h-full w-full" />}
    </div>
  )
}

function SavedDashboards({
  query,
  saved,
}: {
  query: AnalyticsQuery
  saved: ReturnType<typeof useSavedDashboards>
}) {
  const save = useSaveDashboard()
  const [name, setName] = useState('')
  const dashboards = pageItems(saved.data)

  return (
    <aside aria-label="Saved dashboards" className="space-y-4">
      <Card className="gap-3">
        <CardHeader>
          <CardTitle as="h3">Saved dashboards</CardTitle>
          <CardDescription>Keep a range and bucket size for later.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <FormField id="dashboard-name" label="Name">
            <Input
              id="dashboard-name"
              value={name}
              maxLength={80}
              placeholder="Last 90 days"
              onChange={(event) => setName(event.target.value)}
            />
          </FormField>
          <Button
            size="sm"
            disabled={name.trim() === '' || save.isPending}
            onClick={() => save.mutate({ name: name.trim(), query })}
          >
            {save.isPending ? 'Saving…' : 'Save this dashboard'}
          </Button>
          {save.isError ? <InlineError>{describeSaveError(save.error)}</InlineError> : null}
          {save.isSuccess ? (
            <p role="status" className="text-xs text-muted-foreground">
              Saved.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="gap-2">
        <CardHeader>
          <CardTitle as="h3">Your dashboards</CardTitle>
        </CardHeader>
        <CardContent>
          {dashboards.length === 0 ? (
            <p className="text-sm text-muted-foreground">No saved dashboards yet.</p>
          ) : (
            <ul className="divide-y">
              {dashboards.map((dashboard) => (
                <SavedDashboardRow key={dashboard.id} dashboard={dashboard} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </aside>
  )
}

function SavedDashboardRow({ dashboard }: { dashboard: SavedDashboard }) {
  const remove = useDeleteDashboard()
  return (
    <li className="flex items-center gap-2 py-2 first:pt-0 last:pb-0">
      <Link
        href={`/?dashboard=${dashboard.id}`}
        className="inline-flex min-w-0 flex-1 items-center truncate text-sm hover:underline pointer-coarse:min-h-10"
      >
        {dashboard.name}
      </Link>
      <ConfirmDialog
        triggerLabel="Delete"
        triggerSize="xs"
        title={`Delete ${dashboard.name}?`}
        description="Only the saved view is removed. Your activity stays."
        confirmLabel="Delete dashboard"
        run={() => remove.mutateAsync({ dashboardId: dashboard.id })}
        describeError={() => 'The dashboard could not be deleted. Try again.'}
      />
    </li>
  )
}

function useSavedDashboardSelection(
  data: { pages: readonly { items: readonly SavedDashboard[] }[] } | undefined,
  setQuery: (query: AnalyticsQuery) => void,
) {
  const params = useSearchParams()
  const dashboardId = params.get('dashboard')
  const applied = useRef<string | null>(null)

  useEffect(() => {
    if (dashboardId === null || applied.current === dashboardId) return
    const found = pageItems(data).find((dashboard) => dashboard.id === dashboardId)
    if (!found) return
    applied.current = dashboardId
    setQuery(found.query)
  }, [dashboardId, data, setQuery])
}
