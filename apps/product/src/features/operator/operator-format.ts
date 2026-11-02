import { MICROS_PER_USD } from '@replo/contracts'
import { formatUsd } from '@/lib/format'

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

export function formatMicros(micros: number): string {
  return formatUsd(micros / MICROS_PER_USD)
}

export function formatDateTime(iso: string): string {
  return `${DATE_TIME_FORMAT.format(new Date(iso))} UTC`
}

export function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}
