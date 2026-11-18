import type { AnalyticsSeries } from '@replo/contracts'

export const SERIES_COLOURS: Record<string, string> = {
  job_succeeded: 'var(--observed)',
  job_failed: 'var(--destructive)',
  lesson_completed: 'var(--foreground)',
  quiz_submitted: 'var(--muted-foreground)',
}

const FALLBACK_COLOURS = ['var(--foreground)', 'var(--muted-foreground)'] as const

export function colourForSeries(key: string, index: number): string {
  return (
    SERIES_COLOURS[key] ?? FALLBACK_COLOURS[index % FALLBACK_COLOURS.length] ?? FALLBACK_COLOURS[0]
  )
}

export interface BucketRow {
  bucket: string
  values: Record<string, number>
}

export function bucketRows(series: readonly AnalyticsSeries[]): BucketRow[] {
  const rows = new Map<string, BucketRow>()
  for (const item of series) {
    for (const point of item.points) {
      const row = rows.get(point.bucket) ?? { bucket: point.bucket, values: {} }
      row.values[item.key] = point.value
      rows.set(point.bucket, row)
    }
  }
  return [...rows.values()].sort((a, b) => a.bucket.localeCompare(b.bucket))
}

const BUCKET_LABEL = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  timeZone: 'UTC',
})

export function formatBucket(bucket: string): string {
  const date = new Date(`${bucket}T00:00:00.000Z`)
  return Number.isNaN(date.getTime()) ? bucket : BUCKET_LABEL.format(date)
}
