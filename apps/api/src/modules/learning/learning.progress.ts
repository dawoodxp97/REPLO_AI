export function ratioOf(done: number, total: number): number | null {
  return total === 0 ? null : done / total
}

export function countCompleted(
  lessonKeys: readonly string[],
  completed: ReadonlySet<string> | undefined,
): number {
  if (!completed) return 0
  let count = 0
  for (const key of lessonKeys) if (completed.has(key)) count += 1
  return count
}
