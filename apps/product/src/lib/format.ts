import { MICROS_PER_USD } from '@replo/contracts'

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB'] as const

export function formatBytes(bytes: number): string {
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 || value >= 10 ? 0 : 1
  return `${value.toFixed(digits)} ${BYTE_UNITS[unit]}`
}

const USD_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const USD_PRECISE_FORMAT = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 4,
  maximumFractionDigits: 4,
})

const COUNT_FORMAT = new Intl.NumberFormat('en-US')

export function formatUsd(usd: number): string {
  return (usd > 0 && usd < 0.01 ? USD_PRECISE_FORMAT : USD_FORMAT).format(usd)
}

export function formatCount(value: number): string {
  return COUNT_FORMAT.format(value)
}

export function formatMicros(micros: number): string {
  return formatUsd(micros / MICROS_PER_USD)
}

const DATE_TIME_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

export function formatDateTime(iso: string): string {
  return `${DATE_TIME_FORMAT.format(new Date(iso))} UTC`
}

export function formatLatency(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

export function formatDate(iso: string): string {
  return DATE_FORMAT.format(new Date(iso))
}

export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes))
  const hours = Math.floor(total / 60)
  const rest = total % 60
  if (hours === 0) return `${rest} min`
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`
}

export function formatPercent(ratio: number): string {
  return `${Math.round(ratio * 100)}%`
}

export function formatRepoName(owner: string, name: string): string {
  return `${owner}/${name}`
}

export function shortSha(sha: string): string {
  return sha.slice(0, 7)
}
