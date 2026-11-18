import type { AnalyticsModelUse, AnalyticsSeries } from '@replo/contracts'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@replo/ui'
import { bucketRows, colourForSeries, formatBucket } from './analytics-chart-data'

const PADDING = { top: 12, right: 16, bottom: 32, left: 40 }
const CHART_HEIGHT = 260
const ROW_WIDTH = 28

export function TimelineChart({
  series,
  label,
}: {
  series: readonly AnalyticsSeries[]
  label: string
}) {
  const rows = bucketRows(series)
  const values = rows.flatMap((row) => series.map((item) => row.values[item.key] ?? 0))
  const max = Math.max(0, ...values)

  if (rows.length === 0 || max === 0) {
    return <p className="text-sm text-muted-foreground">No activity in this range.</p>
  }

  const width = Math.max(720, rows.length * ROW_WIDTH + PADDING.left + PADDING.right)
  const plotWidth = width - PADDING.left - PADDING.right
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const groupWidth = plotWidth / rows.length
  const barWidth = Math.max(2, Math.min(18, (groupWidth - 8) / series.length))
  const labelStep = Math.max(1, Math.ceil(rows.length / 12))
  const ticks = tickValues(max)

  return (
    <figure className="space-y-3">
      <div
        className="overflow-x-auto rounded-lg border bg-card p-3 shadow-xs"
        role="region"
        aria-label="Activity chart"
        tabIndex={0}
      >
        <svg
          width={width}
          height={CHART_HEIGHT}
          role="img"
          aria-label={`${label}. The table below lists every value.`}
        >
          <g aria-hidden>
            {ticks.map((tick) => {
              const y = PADDING.top + plotHeight - (tick / max) * plotHeight
              return (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    x2={width - PADDING.right}
                    y1={y}
                    y2={y}
                    stroke="var(--border)"
                    strokeWidth={1}
                  />
                  <text
                    x={PADDING.left - 8}
                    y={y + 4}
                    textAnchor="end"
                    fontSize={11}
                    fill="currentColor"
                    className="text-muted-foreground"
                  >
                    {tick}
                  </text>
                </g>
              )
            })}
            {rows.map((row, rowIndex) => {
              const groupX = PADDING.left + rowIndex * groupWidth
              return (
                <g key={row.bucket}>
                  {series.map((item, seriesIndex) => {
                    const value = row.values[item.key] ?? 0
                    if (value === 0) return null
                    const height = (value / max) * plotHeight
                    return (
                      <rect
                        key={item.key}
                        x={
                          groupX +
                          (groupWidth - barWidth * series.length) / 2 +
                          seriesIndex * barWidth
                        }
                        y={PADDING.top + plotHeight - height}
                        width={barWidth}
                        height={height}
                        rx={2}
                        fill={colourForSeries(item.key, seriesIndex)}
                      />
                    )
                  })}
                  {rowIndex % labelStep === 0 ? (
                    <text
                      x={groupX + groupWidth / 2}
                      y={CHART_HEIGHT - 8}
                      textAnchor="middle"
                      fontSize={11}
                      fill="currentColor"
                      className="text-muted-foreground"
                    >
                      {formatBucket(row.bucket)}
                    </text>
                  ) : null}
                </g>
              )
            })}
          </g>
        </svg>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {series.map((item, index) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <svg aria-hidden width={8} height={8} viewBox="0 0 8 8">
              <rect width={8} height={8} rx={1} fill={colourForSeries(item.key, index)} />
            </svg>
            {item.label}
          </span>
        ))}
      </figcaption>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center">
          Show as a table
        </summary>
        <div className="mt-2 overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Bucket</TableHead>
                {series.map((item) => (
                  <TableHead key={item.key} scope="col" className="text-right">
                    {item.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.bucket}>
                  <TableCell className="font-mono text-xs">{row.bucket}</TableCell>
                  {series.map((item) => (
                    <TableCell key={item.key} className="tabular text-right font-mono text-xs">
                      {row.values[item.key] ?? 0}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </figure>
  )
}

export function ModelUsageChart({ models }: { models: readonly AnalyticsModelUse[] }) {
  if (models.length === 0) {
    return <p className="text-sm text-muted-foreground">No generations in this range.</p>
  }

  const width = 720
  const rowHeight = 28
  const labelWidth = 220
  const countWidth = 60
  const barWidth = width - labelWidth - countWidth - 24
  const max = Math.max(...models.map((model) => model.generations))
  const height = models.length * rowHeight + 8

  return (
    <figure className="space-y-2">
      <div
        className="overflow-x-auto rounded-lg border bg-card p-3 shadow-xs"
        role="region"
        aria-label="Model usage chart"
        tabIndex={0}
      >
        <svg width={width} height={height} role="img" aria-label="Generations by model.">
          {models.map((model, index) => {
            const y = index * rowHeight + 4
            return (
              <g key={model.model}>
                <text
                  x={8}
                  y={y + 16}
                  fontSize={12}
                  fill="currentColor"
                  className="text-foreground"
                >
                  {shorten(model.model)}
                </text>
                <rect
                  x={labelWidth}
                  y={y + 5}
                  width={Math.max(2, (model.generations / max) * barWidth)}
                  height={14}
                  rx={2}
                  fill="var(--muted-foreground)"
                />
                <text
                  x={width - 8}
                  y={y + 16}
                  textAnchor="end"
                  fontSize={12}
                  fill="currentColor"
                  className="tabular text-muted-foreground"
                >
                  {model.generations}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground pointer-coarse:inline-flex pointer-coarse:min-h-10 pointer-coarse:items-center">
          Show as a table
        </summary>
        <div className="mt-2 overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Model</TableHead>
                <TableHead scope="col" className="text-right">
                  Generations
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {models.map((model) => (
                <TableRow key={model.model}>
                  <TableCell className="font-mono text-xs">{model.model}</TableCell>
                  <TableCell className="tabular text-right font-mono text-xs">
                    {model.generations}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </details>
    </figure>
  )
}

function tickValues(max: number): number[] {
  const step = Math.max(1, Math.ceil(max / 4))
  return Array.from({ length: 5 }, (_, index) => Math.min(max, index * step)).filter(
    (value, index, values) => values.indexOf(value) === index,
  )
}

function shorten(model: string): string {
  return model.length > 28 ? `${model.slice(0, 27)}…` : model
}
