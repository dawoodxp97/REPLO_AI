export function mean(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)
}

export function ratio(hits: number, total: number): number {
  return total === 0 ? 1 : hits / total
}

export function minimum(values: readonly number[]): number {
  return values.length === 0 ? 0 : Math.min(...values)
}
