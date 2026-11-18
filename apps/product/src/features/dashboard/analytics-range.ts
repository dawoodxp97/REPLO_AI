import { AnalyticsQuery, type AnalyticsGranularity } from '@replo/contracts'

export const ANALYTICS_RANGES = [
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 365, label: '12 months' },
] as const

export const GRANULARITY_LABELS: Record<AnalyticsGranularity, string> = {
  day: 'Day',
  week: 'Week',
  month: 'Month',
}

export function isoDateInZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone,
  }).formatToParts(date)
  const value = (type: 'year' | 'month' | 'day') =>
    parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export function shiftIsoDate(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const shifted = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 1) + days * 86_400_000)
  return shifted.toISOString().slice(0, 10)
}

export function analyticsQueryFor(
  days: number,
  granularity: AnalyticsGranularity,
  timeZone: string,
  now = new Date(),
): AnalyticsQuery {
  const to = isoDateInZone(now, timeZone)
  return AnalyticsQuery.parse({
    from: shiftIsoDate(to, 1 - days),
    to,
    granularity,
    tz: timeZone,
    filters: {},
  })
}
