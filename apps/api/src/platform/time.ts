export const DAY_MS = 24 * 60 * 60 * 1000

export const daysAgo = (now: Date, days: number): Date => new Date(now.getTime() - days * DAY_MS)

export const isoOrNull = (date: Date | null | undefined): string | null =>
  date ? date.toISOString() : null
